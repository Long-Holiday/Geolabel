package com.example.labelMark.controller;

import cn.hutool.core.util.ObjectUtil;
import com.example.labelMark.domain.Mark;
import com.example.labelMark.domain.SysUser;
import com.example.labelMark.domain.Task;
import com.example.labelMark.domain.TaskDatasetInfo;
import com.example.labelMark.domain.Type;
import com.example.labelMark.service.MarkService;
import com.example.labelMark.service.SysUserService;
import com.example.labelMark.service.TaskAcceptedService;
import com.example.labelMark.service.TaskService;
import com.example.labelMark.service.TypeService;
import com.example.labelMark.service.TaskExecutorService;
import com.example.labelMark.service.TaskNotificationService;
import com.example.labelMark.utils.ResultGenerator;
import com.example.labelMark.vo.LoginUser;
import com.example.labelMark.vo.TaskInfoDTO;
import com.example.labelMark.vo.constant.Result;
import com.example.labelMark.vo.constant.StatusEnum;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.models.auth.In;
import org.springframework.context.ApplicationContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import javax.validation.constraints.Pattern;
import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

import static com.example.labelMark.utils.CoordinateConverter.convertGeojson;

/**
 * <p>
 * 前端控制器
 * </p>
 *
 */
@RestController
@RequestMapping("/task")
@Api(tags = "TASK业务控制器")
public class TaskController {

    @Resource
    private TaskService taskService;
    @Resource
    private TypeService typeService;
    @Resource
    private SysUserService sysUserService;
    @Resource
    private TaskAcceptedService taskAcceptedService;
    @Resource
    private MarkService markService;
    @Resource
    private TaskExecutorService taskExecutorService;
    @Resource
    private TaskNotificationService taskNotificationService;
    @Resource
    private ApplicationContext applicationContext;


    @PostMapping("/createTask")
    @ApiOperation("创建任务")
    public Result createTask(String dataRange, String taskName, String taskType, String mapServer) {
        // 获取当前登录用户信息
        LoginUser loginUser = (LoginUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        SysUser currentUser = loginUser.getSysUser();
        int isSucceed = taskService.createTask(dataRange, taskName, taskType, mapServer, currentUser.getUserid(), 0);
        if (isSucceed != -1) {
            return ResultGenerator.getSuccessResult("插入成功");
        }
        return ResultGenerator.getSuccessResult("插入失败");
    }

    @PostMapping("/publishTask")
    @ApiOperation("创建任务,包括保存关联的指定任务用户和类型")
    public Result publishTask(@RequestBody Map<String, Object> map) {
        // 获取当前登录用户信息
        LoginUser loginUser = (LoginUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        SysUser currentUser = loginUser.getSysUser();
        Integer creatorUserId = currentUser.getUserid();
        Integer teamId = currentUser.getTeamId(); // 获取当前用户的teamId
        // Integer userid = currentUser.getUserid(); // creatorUserId 就是当前用户ID，这个可以移除或注释掉

        ArrayList<String> dateRange = (ArrayList<String>) map.get("daterange");
        String taskName = map.get("taskname").toString();
        String taskType = map.get("type").toString();
        String mapServer = map.get("mapserver").toString();
        String dateRangeStr = dateRange.get(0) + " " + dateRange.get(1);

        // 获取积分值（如果有）
        Integer taskScore = 0;
        if (map.containsKey("score") && map.get("score") != null) {
            try {
                Object scoreObj = map.get("score");
                if (scoreObj instanceof Integer) {
                    taskScore = (Integer) scoreObj;
                } else if (scoreObj instanceof Double) { // 处理前端可能传Double的情况
                    taskScore = ((Double) scoreObj).intValue();
                } else {
                    String scoreStr = scoreObj.toString().trim();
                    if (!scoreStr.isEmpty()) {
                        taskScore = (int) Double.parseDouble(scoreStr);
                    }
                }
                if (taskScore < 0) taskScore = 0; // 确保积分为非负
            } catch (NumberFormatException e) {
                taskScore = 0; // 解析失败默认为0
            }
        }

        // 获取目标用户类型和对应的数据
        String targetUserType = map.get("targetUserType").toString();
        int taskClass = 0; // 0: 团队相关, 1: 非团队相关 (个人或公开)

        // 判断任务类型 (taskClass)
        if (currentUser.getIsadmin() == 0) { // 普通用户发布
            targetUserType = "allNonAdminUsers"; // 普通用户只能发布给所有非管理员
            taskClass = 1; // 标记为非团队任务
        } else { // 管理员发布
            if ("allNonTeamUsers".equals(targetUserType)) {
                taskClass = 1; // 非团队任务
            } else if ("specificTeamUsers".equals(targetUserType) || "allTeamMembers".equals(targetUserType)) {
                taskClass = 0; // 团队任务
            } else {
                return ResultGenerator.getFailResult("无效的目标用户类型");
            }
        }

        // 非团队任务(taskClass=1)且设置了积分(taskScore > 0)，则检查并扣除创建者积分
        if (taskClass == 1 && taskScore > 0) {
            Integer creatorCurrentScore = currentUser.getScore() != null ? currentUser.getScore() : 0;
            if (creatorCurrentScore < taskScore) {
                return ResultGenerator.getFailResult("积分不足，无法创建任务。您需要 " + taskScore + " 积分，当前拥有 " + creatorCurrentScore + " 积分。");
            }
            boolean subtractSuccess = sysUserService.subtractUserScore(creatorUserId, taskScore);
            if (!subtractSuccess) {
                return ResultGenerator.getFailResult("扣除发布者积分失败，请重试");
            }
        }

        // 创建任务
        int taskId = taskService.createTask(dateRangeStr, taskName, taskType, mapServer, creatorUserId, taskClass);

        if (taskId == -1) {
            // 如果任务创建失败，并且之前扣除了积分，则回滚积分
            if (taskClass == 1 && taskScore > 0) {
                sysUserService.addUserScore(creatorUserId, taskScore); // 归还积分
            }
            return ResultGenerator.getFailResult("创建任务主体失败");
        }

        // 如果任务创建成功，且设置了任务积分，则更新任务表中的score字段
        if (taskScore > 0) {
            taskService.updateTaskScore(taskId, taskScore);
        }

        // ... (后续分配任务给用户的逻辑)
        List<SysUser> targetUsers = new ArrayList<>();
        Integer currentUserId = currentUser.getUserid(); // 用一个新变量存储，避免混淆

        // 普通用户发布任务 (targetUserType 已经固定为 allNonAdminUsers)
        if (currentUser.getIsadmin() == 0) {
            targetUsers = sysUserService.getAllNonAdminUsers();
            targetUsers.removeIf(user -> user.getUserid().equals(currentUserId)); // 排除创建者自己

            List<?> rawSelectedSampleTypes = (List<?>) map.get("selectedSampleTypes");
            List<String> typeIdListForNonAdmin = new ArrayList<>();
            if (rawSelectedSampleTypes != null) {
                for (Object typeId : rawSelectedSampleTypes) {
                    typeIdListForNonAdmin.add(String.valueOf(typeId));
                }
            }
            String commonTypeStr = String.join(",", typeIdListForNonAdmin);
            for (SysUser user : targetUsers) {
                if (!taskAcceptedService.createTaskAccept(taskId, user.getUsername(), commonTypeStr)) {
                    // 注意：部分失败时的处理，是否要回滚已创建的task_accepted记录，或者整个事务回滚
                    return ResultGenerator.getFailResult("为用户 '" + user.getUsername() + "' 分配任务失败");
                }
            }
        } 
        // 管理员发布任务
        else {
            if ("allTeamMembers".equals(targetUserType)) {
                if (teamId == null) return ResultGenerator.getFailResult("管理员无团队信息，无法分配给所有团队成员");
                targetUsers = sysUserService.getUsersByTeamIdAndNotAdmin(teamId);
                targetUsers.removeIf(user -> user.getUserid().equals(currentUserId));

                List<?> rawSelectedSampleTypes = (List<?>) map.get("selectedSampleTypes");
                List<String> typeIdListForAllTeam = new ArrayList<>();
                if (rawSelectedSampleTypes != null) {
                    for (Object typeId : rawSelectedSampleTypes) {
                        typeIdListForAllTeam.add(String.valueOf(typeId));
                    }
                }
                String commonTypeStr = String.join(",", typeIdListForAllTeam);
                for (SysUser user : targetUsers) {
                    if (!taskAcceptedService.createTaskAccept(taskId, user.getUsername(), commonTypeStr)) {
                        return ResultGenerator.getFailResult("为团队成员 '" + user.getUsername() + "' 分配任务失败");
                    }
                }
            } else if ("allNonTeamUsers".equals(targetUserType)) {
                targetUsers = sysUserService.getNonTeamUsersAndNotAdmin(teamId); // teamId 用于排除团队成员
                targetUsers.removeIf(user -> user.getUserid().equals(currentUserId));
                
                List<?> rawSelectedSampleTypes = (List<?>) map.get("selectedSampleTypes");
                List<String> typeIdListForAllNonTeam = new ArrayList<>();
                 if (rawSelectedSampleTypes != null) {
                    for (Object typeId : rawSelectedSampleTypes) {
                        typeIdListForAllNonTeam.add(String.valueOf(typeId));
                    }
                }
                String commonTypeStr = String.join(",", typeIdListForAllNonTeam);
                for (SysUser user : targetUsers) {
                    if (!taskAcceptedService.createTaskAccept(taskId, user.getUsername(), commonTypeStr)) {
                        return ResultGenerator.getFailResult("为非团队用户 '" + user.getUsername() + "' 分配任务失败");
                    }
                }
            } else if ("specificTeamUsers".equals(targetUserType)) {
                if (teamId == null) return ResultGenerator.getFailResult("管理员无团队信息，无法分配给指定团队用户");
                ArrayList<Map<String, Object>> specificUserAssignments = (ArrayList<Map<String, Object>>) map.get("specificUserAssignments");
                if (specificUserAssignments == null || specificUserAssignments.isEmpty()) {
                    return ResultGenerator.getFailResult("未指定任何用户进行任务分配");
                }
                for (Map<String, Object> assignment : specificUserAssignments) {
                    String username = assignment.get("username").toString();
                    SysUser targetUser = sysUserService.findByUsername(username);
                    // 确保用户存在且是团队成员 (或者如果允许分配给非团队的特定用户，则调整此逻辑)
                    if (targetUser == null || !teamId.equals(targetUser.getTeamId())) {
                         return ResultGenerator.getFailResult("用户 '" + username + "' 不存在或不属于您的团队");
                    }
                    if (targetUser.getUserid().equals(currentUserId)) continue; // 不能分配给自己

                    List<?> rawTypeArr = (List<?>) assignment.get("typeArr");
                    List<String> typeStrList = new ArrayList<>();
                    if (rawTypeArr != null) {
                        for (Object typeId : rawTypeArr) {
                            typeStrList.add(String.valueOf(typeId));
                        }
                    }
                    if (typeStrList.isEmpty()) {
                         return ResultGenerator.getFailResult("未给用户 '" + username + "' 分配任何样本类型");
                    }
                    String typeStr = String.join(",", typeStrList);
                    if (!taskAcceptedService.createTaskAccept(taskId, username, typeStr)) {
                        return ResultGenerator.getFailResult("为特定用户 '" + username + "' 分配任务失败");
                    }
                }
            }
        }
        return ResultGenerator.getSuccessResult("任务创建及分配成功");
    }

    @GetMapping("/getTaskInfo")
    @ApiOperation("获取任务")
    public Map<String, Object> getTaskInfo(@RequestParam(required = false) Integer taskid,
                                           @RequestParam(required = false) Integer current,
                                           @RequestParam(required = false) Integer pageSize,
                                           @RequestParam(required = false) String taskname,
                                           @RequestParam(required = false) String userArr,
                                           @RequestParam(required = false) Integer isAdmin,
                                           @RequestParam(required = false) Integer status) {

        // 获取当前登录用户信息
        LoginUser loginUser = (LoginUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        SysUser currentUser = loginUser.getSysUser();
        Integer requestingUserId = currentUser.getUserid();
        Integer userId = currentUser.getUserid();

        // 无参时默认值
        if (ObjectUtil.isEmpty(current)) {
            current = 1;
        }
        if (ObjectUtil.isEmpty(pageSize)) {
            pageSize = 5;
        }

        List<TaskInfoDTO> result = new ArrayList<>();
        int taskCount = 0;

        // 无论是普通用户还是管理员，都只能看到自己创建的任务
        result = taskService.getTasksByCreatorId(requestingUserId);
        taskCount = result.size();

        // 补充用户和类型信息
        for (TaskInfoDTO taskInfo : result) {
            int taskId = taskInfo.getTaskid();

            // 获取任务相关的用户信息
            List<Map<String, Object>> userArrOrigin = new ArrayList<>();
            List<String> usernames = taskService.findUserListByTaskId(taskId);

            for (String username : usernames) {
                SysUser user = sysUserService.findByUsername(username);
                if (user != null) {
                    // 获取分配给该用户的类型
                    String typeString = taskAcceptedService.getTypeArrByTaskIdAndUsername(taskId, username);
                    List<Type> typeArr = new ArrayList<>();

                    if (typeString != null && !typeString.isEmpty()) {
                        List<Integer> typeIds = Arrays.stream(typeString.split(","))
                                .map(Integer::parseInt)
                                .collect(Collectors.toList());

                        for (Integer typeId : typeIds) {
                            String typeName = typeService.getTypeNameById(typeId);
                            List<Type> types = typeService.getTypes(current, pageSize, typeId, typeName);
                            if (!types.isEmpty()) {
                                typeArr.add(types.get(0));
                            }
                        }
                    }

                    Map<String, Object> info = new HashMap<>();
                    info.put("userid", user.getUserid());
                    info.put("username", user.getUsername());
                    info.put("typeArr", typeArr);
                    userArrOrigin.add(info);
                }
            }

            taskInfo.setUserArr(userArrOrigin);
        }

        // 特定任务ID过滤
        if (taskid != null) {
            result = result.stream()
                    .filter(item -> taskid.equals(item.getTaskid()))
                    .collect(Collectors.toList());
        }

        // 模糊查询：按任务名
        if (taskname != null && !taskname.isEmpty()) {
            result = result.stream()
                    .filter(item -> item.getTaskname().contains(taskname))
                    .collect(Collectors.toList());
        }

        // 状态过滤
        if (status != null) {
            result = result.stream()
                    .filter(item -> status.equals(item.getStatus()))
                    .collect(Collectors.toList());
        }

        List<Mark> marks = new ArrayList<>();
        if (taskid != null) {
            marks = markService.getMarkByTaskId(taskid);
        }

        // 计算过滤后的总数
        int filteredTotal = result.size();

        // 计算起始索引和结束索引，实现分页
        int startIndex = (current - 1) * pageSize;
        int endIndex = Math.min(startIndex + pageSize, result.size());

        // 防止索引越界
        if (startIndex < result.size()) {
            result = result.subList(startIndex, endIndex);
        } else {
            result = new ArrayList<>();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", result);
        response.put("success", true);
        response.put("markGeoJsonArr", convertGeojson(marks));
        response.put("total", filteredTotal); // 返回过滤后的总数
        return response;
    }

    @PutMapping("/updateTask")
    public Result updateTask(@RequestBody Map<String, Object> map) {
        ArrayList<String> dateRange = (ArrayList<String>) map.get("daterange");
        String taskName = map.get("taskname").toString();
        String taskType = map.get("type").toString();
        ArrayList<String> usernameAndTypeArr = (ArrayList<String>) map.get("userArr");
        String mapServer = map.get("mapserver").toString();
        Integer taskId = Integer.valueOf(map.get("taskid").toString());
//        拼接起止日期
        String dateRangeStr = dateRange.get(0) + " " + dateRange.get(1);

        taskService.updateTaskById(taskId, taskName, dateRangeStr, taskType, mapServer);

        //        拆解用户和所属类型
        String username, typeArr = "";
        for (String usernameAndType : usernameAndTypeArr) {
            String[] usernameAndTypeStr = usernameAndType.split(",");
            username = usernameAndTypeStr[0];
            for (int i = 1; i < usernameAndTypeStr.length; i++) {
                if (i == usernameAndTypeStr.length - 1) {
                    typeArr += usernameAndTypeStr[i];
                } else {
                    typeArr += usernameAndTypeStr[i] + ",";
                }
            }
            boolean isUpdate = taskAcceptedService.createTaskAccept(taskId, username, typeArr);
//            重置
            typeArr = "";
            if (isUpdate == false) {
                return ResultGenerator.getSuccessResult("插入接收任务失败");
            }
        }
        return ResultGenerator.getSuccessResult("任务更新成功");
        }

    @DeleteMapping("/deleteTask/{taskId}")
    public Result deleteTask(@PathVariable int taskId) {
        taskAcceptedService.deleteTaskAcceptByTaskId(taskId);
        taskService.deleteTaskById(taskId);
        markService.deleteMarkByTaskId(taskId);
        return ResultGenerator.getSuccessResult("任务删除成功");
    }

    @PostMapping("/submitTask")
    public Result submitTask(@RequestBody Map<String, Object> map) {
        Integer taskId = (Integer) map.get("taskid");
        if (markService.GetTaskIdNum(taskId) == 0) {
            return ResultGenerator.getFailResult("未开始标注");
        }
        taskService.updateTaskStatus(taskId);
        return ResultGenerator.getSuccessResult("任务提交成功，审核中");
    }

    @PostMapping("/auditTask")
    public Result auditTask(@RequestBody Map<String, Object> map) {
        Integer taskId = Integer.valueOf(map.get("taskId").toString());
        Integer status = Integer.valueOf(map.get("status").toString());
        String auditFeedback = ObjectUtil.toString(map.get("auditFeedback"));

        taskService.auditTask(taskId, status, auditFeedback);

        // 如果审核通过 (status == 1)，给提交者增加积分
        if (status == 1) {
            Task task = taskService.selectTaskById(taskId);
            if (task != null && task.getSubmitterId() != null && task.getScore() != null && task.getScore() > 0) {
                Integer submitterId = task.getSubmitterId();
                Integer taskScore = task.getScore();
                boolean addScoreSuccess = sysUserService.addUserScore(submitterId, taskScore);
                if (!addScoreSuccess) {
                    // 记录日志或进行其他错误处理，但通常不应阻止审核通过的流程
                    System.err.println("为用户 " + submitterId + " 增加积分 " + taskScore + " 失败，任务ID: " + taskId);
                }
            }
        }
        return ResultGenerator.getSuccessResult("审核成功");
    }

    @GetMapping("/getPersonalTaskList")
    @ApiOperation("获取分配给当前用户的任务列表")
    public Map<String, Object> getPersonalTaskList(@RequestParam(required = false) Integer taskid,
                                           @RequestParam(required = false) Integer current,
                                           @RequestParam(required = false) Integer pageSize,
                                           @RequestParam(required = false) String taskname,
                                           @RequestParam(required = false) Integer taskClass) {

        // 获取当前登录用户信息
        LoginUser loginUser = (LoginUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        SysUser currentUser = loginUser.getSysUser();
        String username = currentUser.getUsername();
        Integer userId = currentUser.getUserid();
        // 无参时默认值
        if (ObjectUtil.isEmpty(current)) {
            current = 1;
        }
        if (ObjectUtil.isEmpty(pageSize)) {
            pageSize = 5;
        }

        // 获取分配给当前用户的任务
        List<TaskInfoDTO> list = taskService.getTaskInfo(username);

        List<TaskInfoDTO> result = new ArrayList<>();

        // 处理任务信息
        for (TaskInfoDTO taskInfo : list) {
            // 标记已经存在的同一任务taskInfo对象
            TaskInfoDTO existingObj = null;
            int index = -1;
            for (int i = 0; i < result.size(); i++) {
                if (ObjectUtil.equals(result.get(i).getTaskid(), taskInfo.getTaskid())) {
                    existingObj = result.get(i);
                    index = i;
                }
            }
            // 处理typestring得到有效信息
            String typestring = taskInfo.getTypeArr();
            // 标注地图时才需要遍历标签方案
            List<Integer> type = new ArrayList<>();
            if (typestring != null && !typestring.isEmpty()) {
                type = Arrays.stream(typestring.split(","))
                        .map(Integer::parseInt)
                        .collect(Collectors.toList());
            }
            List<Type> typeArr = new ArrayList<>();
            if (ObjectUtil.isNotNull(taskInfo.getTaskid())) {
                for (Integer typeId : type) {
                    String typeName = typeService.getTypeNameById(typeId);
                    List<Type> types = typeService.getTypes(current, pageSize, typeId, typeName);
                    typeArr.add(types.get(0));
                }
            }
            Map<String, Object> info = new HashMap<>();
            info.put("userid", taskInfo.getUserid());
            info.put("username", taskInfo.getUsername());
            info.put("id", taskInfo.getId());
            info.put("typeArr", typeArr);
            if (existingObj != null) {
                // 如果已经存在，直接将用户信息添加到 userArr 数组中
                List<Map<String, Object>> userArrOrigin = existingObj.getUserArr();
                userArrOrigin.add(info);
                taskInfo.setUserArr(userArrOrigin);
                // 确保保留taskClass值
                taskInfo.setTaskClass(existingObj.getTaskClass());
                result.set(index, taskInfo);
            } else {
                List<Map<String, Object>> userArrOrigin = new ArrayList<>();
                userArrOrigin.add(info);
                taskInfo.setUserArr(userArrOrigin);
                // 确保从数据库获取的taskClass值已经设置
                if (taskInfo.getTaskClass() == null) {
                    Task task = taskService.selectTaskById(taskInfo.getTaskid());
                    if (task != null) {
                        taskInfo.setTaskClass(task.getTaskClass());
                    } else {
                        // 默认为团队任务
                        taskInfo.setTaskClass(0);
                    }
                }
                result.add(taskInfo);
            }
        }

        // 后端过滤：排除状态为1（审核通过）的任务
        result = result.stream()
                .filter(item -> item.getStatus() != 1)
                .collect(Collectors.toList());

        // 后端过滤：按任务类型过滤
        if (taskClass != null) {
            result = result.stream()
                    .filter(item -> {
                        Integer itemTaskClass = item.getTaskClass();
                        if (itemTaskClass == null) {
                            itemTaskClass = 0; // 默认为团队任务
                        }
                        return taskClass.equals(itemTaskClass);
                    })
                    .collect(Collectors.toList());
        }

        // 模糊查询：按任务名
        if (taskname != null && !taskname.isEmpty()) {
            result = result.stream()
                    .filter(item -> item.getTaskname().contains(taskname))
                    .collect(Collectors.toList());
        }

        // 特定任务ID过滤
        if (taskid != null) {
            result = result.stream()
                    .filter(item -> taskid.equals(item.getTaskid()))
                    .collect(Collectors.toList());
        }

        // 计算过滤后的总数
        int filteredTotal = result.size();

        List<Mark> marks = new ArrayList<>();
        if (taskid != null) {
            marks = markService.getMarkByTaskId(taskid);
        }

        // 计算起始索引和结束索引，实现分页
        int startIndex = (current - 1) * pageSize;
        int endIndex = Math.min(startIndex + pageSize, result.size());

        // 防止索引越界
        if (startIndex < result.size()) {
            result = result.subList(startIndex, endIndex);
        } else {
            result = new ArrayList<>();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", result);
        response.put("success", true);
        response.put("markGeoJsonArr", convertGeojson(marks));
        response.put("total", filteredTotal); // 返回过滤后的总数
        return response;
    }

    @GetMapping("/getMarkTaskDetail")
    @ApiOperation("获取标注页面所需的任务详情，专用于标注界面")
    public Map<String, Object> getMarkTaskDetail(@RequestParam Integer taskid) {
        // 获取当前登录用户信息
        LoginUser loginUser = (LoginUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        SysUser currentUser = loginUser.getSysUser();
        String username = currentUser.getUsername();
        Integer userId = currentUser.getUserid();
        
        // 获取任务详情
        Task task = taskService.selectTaskById(taskid);
        if (task == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 400);
            errorResponse.put("message", "任务不存在");
            return errorResponse;
        }
        
        // 创建标准化的任务信息对象
        TaskInfoDTO taskInfo = new TaskInfoDTO();
        taskInfo.setTaskid(task.getTaskId());
        taskInfo.setTaskname(task.getTaskName());
        taskInfo.setType(task.getTaskType());
        taskInfo.setMapserver(task.getMapServer());
        taskInfo.setDaterange(task.getDateRange());
        taskInfo.setStatus(task.getStatus());
        taskInfo.setAuditfeedback(task.getAuditFeedback());
        taskInfo.setTaskClass(task.getTaskClass());
        taskInfo.setScore(task.getScore());
        
        // 获取与该任务关联的用户信息
        List<Map<String, Object>> userArrOrigin = new ArrayList<>();
        List<String> usernames = taskService.findUserListByTaskId(taskid);
        
        for (String user : usernames) {
            SysUser userObj = sysUserService.findByUsername(user);
            if (userObj != null) {
                // 获取分配给该用户的类型
                String typeString = taskAcceptedService.getTypeArrByTaskIdAndUsername(taskid, user);
                List<Type> typeArr = new ArrayList<>();
                
                if (typeString != null && !typeString.isEmpty()) {
                    List<Integer> typeIds = Arrays.stream(typeString.split(","))
                            .map(Integer::parseInt)
                            .collect(Collectors.toList());
                    
                    for (Integer typeId : typeIds) {
                        String typeName = typeService.getTypeNameById(typeId);
                        List<Type> types = typeService.getTypes(1, 100, typeId, typeName);
                        if (!types.isEmpty()) {
                            typeArr.add(types.get(0));
                        }
                    }
                }
                
                Map<String, Object> info = new HashMap<>();
                info.put("userid", userObj.getUserid());
                info.put("username", userObj.getUsername());
                info.put("typeArr", typeArr);
                userArrOrigin.add(info);
            }
        }
        
        taskInfo.setUserArr(userArrOrigin);
        
        // 获取标注数据
        List<Mark> marks = markService.getMarkByTaskId(taskid);
        
        // 构建响应
        Map<String, Object> response = new HashMap<>();
        List<TaskInfoDTO> resultList = new ArrayList<>();
        resultList.add(taskInfo);
        
        response.put("code", 200);
        response.put("data", resultList);
        response.put("success", true);
        response.put("markGeoJsonArr", convertGeojson(marks));
        return response;
    }

    @PostMapping("/batchTrain")
    public Map<String, Object> batchTrain(@RequestBody Map<String, Object> request) {
        try {
            // 获取前端传来的参数
            @SuppressWarnings("unchecked")
            List<String> taskIds = (List<String>) request.get("taskids");
            String taskType = request.get("task_type") != null ? request.get("task_type").toString() : "";
            String userId = request.get("user_id") != null ? request.get("user_id").toString() : null;
            String functionName = request.get("functionName") != null ? request.get("functionName").toString() : "";
            String assistInput = request.get("assistInput") != null ? request.get("assistInput").toString() : "";
            String modelName = request.get("modelName") != null ? request.get("modelName").toString() : "";
            
            @SuppressWarnings("unchecked")
            Map<String, Object> params = (Map<String, Object>) request.get("parameters");
            
            // 获取参数，处理可能的 null 值
            String param1 = params.get("param1") != null ? params.get("param1").toString() : "";
            String param2 = params.get("param2") != null ? params.get("param2").toString() : "";
            String param3 = params.get("param3") != null ? params.get("param3").toString() : "";
            String param4 = params.get("param4") != null ? params.get("param4").toString() : "";
            
            // 处理categoryMapping，确保是有效的JSON格式
            String categoryMapping = "{}";
            if (params.get("categoryMapping") != null) {
                try {
                    ObjectMapper objectMapper = new ObjectMapper();
                    Map<String, Object> mappingMap;
                    // 尝试将参数解析为Map
                    if (params.get("categoryMapping") instanceof String) {
                        mappingMap = objectMapper.readValue(params.get("categoryMapping").toString(), 
                                                          new TypeReference<Map<String, Object>>() {});
                    } else {
                        mappingMap = (Map<String, Object>) params.get("categoryMapping");
                    }
                    // 转换为标准JSON字符串
                    categoryMapping = objectMapper.writeValueAsString(mappingMap);
                } catch (Exception e) {
                    // 如果解析失败，使用空对象
                    System.err.println("解析categoryMapping失败: " + e.getMessage());
                    categoryMapping = "{}";
                }
            }
            
            // 构造mapfile_path列表
            List<String> mapfilePaths = new ArrayList<>();
            for (String taskId : taskIds) {
                String fileName = taskService.getServerById(Integer.parseInt(taskId));
                Path mapfilePath = Path.of(Paths.get(System.getProperty("user.dir") + File.separator +
                        "src/main/java/com/example/labelMark/resource/output") + File.separator + fileName);
                mapfilePaths.add(mapfilePath.toString());
            }
            
            // 准备请求体
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("taskid", taskIds);
            requestBody.put("mapfile_path", mapfilePaths);
            requestBody.put("functionName", functionName);
            requestBody.put("assistInput", assistInput);
            requestBody.put("modelName", modelName);
            requestBody.put("param1", param1);
            requestBody.put("param2", param2);
            requestBody.put("param3", param3);
            requestBody.put("param4", param4);
            requestBody.put("categoryMapping", categoryMapping);
            requestBody.put("user_id", userId);
            requestBody.put("tasktype", taskType);
            
            System.out.println("批量训练请求体: " + requestBody);
            
            // 将任务提交到队列异步执行
            taskExecutorService.executeMultiAssistFunctionAsync(requestBody);
            
            // 返回任务已提交的响应
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "批量训练任务已提交，正在后台处理中");
            return response;
            
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> response = new HashMap<>();
            response.put("code", StatusEnum.FAIL.code);
            response.put("message", "批量训练任务提交失败: " + e.getMessage());
            return response;
        }
    }

    @PostMapping("/batchInference")
    public Map<String, Object> batchInference(@RequestBody Map<String, Object> request) {
        try {
            // 获取前端传来的参数
            @SuppressWarnings("unchecked")
            List<String> taskIds = (List<String>) request.get("taskids");
            String userId = request.get("user_id") != null ? request.get("user_id").toString() : null;
            String model = request.get("model") != null ? request.get("model").toString() : "";
            
            @SuppressWarnings("unchecked")
            Map<String, Object> params = (Map<String, Object>) request.get("parameters");
            
            // 获取参数，处理可能的 null 值
            String param1 = params.get("param1") != null ? params.get("param1").toString() : "";
            String param2 = params.get("param2") != null ? params.get("param2").toString() : "";
            String param3 = params.get("param3") != null ? params.get("param3").toString() : "";
            String param4 = params.get("param4") != null ? params.get("param4").toString() : "";
            
            // 处理categoryMapping，确保是有效的JSON格式
            String categoryMapping = "{}";
            if (params.get("categoryMapping") != null) {
                try {
                    ObjectMapper objectMapper = new ObjectMapper();
                    Map<String, Object> mappingMap;
                    // 尝试将参数解析为Map
                    if (params.get("categoryMapping") instanceof String) {
                        mappingMap = objectMapper.readValue(params.get("categoryMapping").toString(), 
                                                          new TypeReference<Map<String, Object>>() {});
                    } else {
                        mappingMap = (Map<String, Object>) params.get("categoryMapping");
                    }
                    // 转换为标准JSON字符串
                    categoryMapping = objectMapper.writeValueAsString(mappingMap);
                } catch (Exception e) {
                    // 如果解析失败，使用空对象
                    System.err.println("解析categoryMapping失败: " + e.getMessage());
                    categoryMapping = "{}";
                }
            }
            
            System.out.println("批量推理请求体: " + request);
            
            // 为每个任务创建推理请求并异步执行
            for (String taskId : taskIds) {
                String fileName = taskService.getServerById(Integer.parseInt(taskId));
                Path mapfilePath = Path.of(Paths.get(System.getProperty("user.dir") + File.separator +
                        "src/main/java/com/example/labelMark/resource/output") + File.separator + fileName);
                
                // 准备单个推理请求体
                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("taskid", taskId);
                requestBody.put("mapfile_path", mapfilePath.toString());
                requestBody.put("user_id", userId);
                requestBody.put("model", model);
                requestBody.put("param1", param1);
                requestBody.put("param2", param2);
                requestBody.put("param3", param3);
                requestBody.put("param4", param4);
                requestBody.put("categoryMapping", categoryMapping);
                requestBody.put("modelScopeStr", "");
                
                // 提交到异步执行队列
                taskExecutorService.executeInferenceFunctionAsync(requestBody);
            }
            
            // 返回任务已提交的响应
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "批量推理任务已提交，正在后台处理中");
            return response;
            
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> response = new HashMap<>();
            response.put("code", StatusEnum.FAIL.code);
            response.put("message", "批量推理任务提交失败: " + e.getMessage());
            return response;
        }
    }
}

