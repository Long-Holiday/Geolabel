import { Modal, Form, Input, Select, DatePicker, message, Radio, InputNumber } from 'antd';
import moment from 'moment';
import UserTransfer from './UserTransfer';
import { useEffect, useState } from 'react';
import { useModel } from 'umi';
const { RangePicker } = DatePicker;

// 封装模态框表单
export default ({
  open,
  onCreate,
  onCancel,
  renderUserList,
  renderServiceList,
  defaultValue,
  renderTypeList,
}) => {
  const [form] = Form.useForm();
  const [userList, setUserList] = useState([]);
  const [typeList, setTypeList] = useState(renderTypeList);
  const [selectedItems, setSelectedItems] = useState([]);
  const filteredOptions = typeList?.filter(({ typename }) => !selectedItems.includes(typename));
  
  // 获取当前用户信息和影像集分组信息
  const { initialState } = useModel('@@initialState');
  const { currentState } = initialState || {};
  const isAdmin = currentState?.isAdmin === 1;
  const { serverListBySetName, getServerListBySetName } = useModel('serverModel');
  
  // 初始化targetUserType状态
  const [targetUserType, setTargetUserType] = useState(isAdmin ? 'specificTeamUsers' : 'allNonAdminUsers');
  const [mapSelectMode, setMapSelectMode] = useState('byName'); // 默认按影像名称选择

  let { taskid, taskname, type, mapserver, daterange, userArr } = defaultValue;

  useEffect(() => {
    if (renderTypeList.length) {
      setTypeList(renderTypeList);
    }
    // 设置标签默认值;
    console.log(userArr);
    setUserList(
      userArr?.map(({ username, typeArr }) => {
        return {
          userName: username,
          //只保留数组中的类型名称用于显示
          typestring: typeArr.map(item =>{
            return item.typeName;
          }),
        };
      }),
    );
    
    // 普通用户默认选择"所有非管理员用户"
    if (!isAdmin) {
      setTargetUserType('allNonAdminUsers');
      form.setFieldsValue({ targetUserType: 'allNonAdminUsers' });
    }
    
    // 获取影像集分组数据
    getServerListBySetName();
  }, [renderTypeList, isAdmin, form, getServerListBySetName]);

  let userArrId = [];
  let defaultUserArr = [];
  if (userArr) {
    // 设置多人初始值
    defaultUserArr = userArr.map(({ username, id }) => {
      userArrId.push(id);
      return username;
    });
  }
  // 转换时间
  if (daterange) {
    daterange=daterange.split(' ');
    daterange = {
      startValue: moment(daterange[0], 'YYYY-MM-DD'),
      endValue: moment(daterange[1], 'YYYY-MM-DD'),
      endOpen: false,
    };
  }
  const onChange = (value) => {
    console.log(`selected ${value}`);
  };
  const onSearch = (value) => {
    console.log('search:', value);
  };

  // 处理目标用户类型变更
  const handleTargetUserTypeChange = (value) => {
    // 普通用户不允许更改目标用户类型
    if (!isAdmin) {
      return;
    }
    
    setTargetUserType(value);
    
    // 清除之前可能选择的用户
    if (value !== 'specificTeamUsers') {
      form.setFieldsValue({ userArr: [] });
      setUserList([]);
    }
    
    // 当切换到"所有团队成员"时，清空积分字段
    if (value === 'allTeamMembers') {
      form.setFieldsValue({ score: undefined });
    } else if (value === 'allNonTeamUsers' || value === 'allNonAdminUsers') {
      // 当切换到"所有非团队用户"或"所有非管理员用户"时，设置默认积分为0
      form.setFieldsValue({ score: 0 });
    }
  };
  
  // 处理地图选择模式变更
  const handleMapSelectModeChange = (e) => {
    const mode = e.target.value;
    setMapSelectMode(mode);
    // 清空当前选择的底图
    form.setFieldsValue({ mapserver: [] });
  };
  
  // 渲染影像集选择器选项
  const renderSetNameOptions = () => {
    return Object.keys(serverListBySetName).map(setName => (
      <Select.Option key={setName} value={setName}>
        {setName}
      </Select.Option>
    ));
  };
  
  // 当选择影像集时的处理
  const handleSetNameChange = (setNames) => {
    if (!setNames || setNames.length === 0) {
      form.setFieldsValue({ mapserver: [] });
      return;
    }
    
    // 根据选择的影像集名称，找出所有对应的影像名称
    const selectedMapservers = [];
    setNames.forEach(setName => {
      if (serverListBySetName[setName]) {
        selectedMapservers.push(...serverListBySetName[setName]);
      }
    });
    
    // 更新表单的mapserver字段
    form.setFieldsValue({ mapserver: selectedMapservers });
  };

  // 判断是否应该显示积分输入框
  const shouldShowScoreInput = () => {
    // 非管理员用户总是显示积分输入框
    if (!isAdmin) {
      return true;
    }
    
    // 管理员用户只有在选择"所有非团队用户"时显示积分输入框
    return targetUserType === 'allNonTeamUsers';
  };

  return (
    <Modal
      open={open}
      title="任务管理"
      okText="提交"
      cancelText="取消"
      onCancel={onCancel}
      width={800}
      onOk={() => {
        form
          .validateFields()
          .then((values) => {
            // 根据目标用户类型处理表单数据
            const formData = { ...values };
            
            // 添加目标用户类型
            formData.targetUserType = targetUserType;
            
            // 如果是非团队任务 (targetUserType === 'allNonAdminUsers' 或者 isAdmin 为 false 且选择了 allNonTeamUsers)
            // 并且 score 存在，则加入到 formData 中
            const isNonTeamTask = targetUserType === 'allNonAdminUsers' || targetUserType === 'allNonTeamUsers';
            if (isNonTeamTask && formData.score !== undefined) {
                // score 已经由 Form 收集
            } else if (isNonTeamTask) {
                formData.score = 0; // 默认积分为0
            }

            if (targetUserType === 'specificTeamUsers') {
              // 为特定用户分配任务时，构建userArr和specificUserAssignments
              const specificUserAssignments = [];
              
              // 准备特定用户的分配信息
              userList?.forEach(({ userName }) => {
                const typeArr = formData[userName] || [];
                specificUserAssignments.push({
                  username: userName,
                  typeArr: typeArr
                });
              });
              
              formData.specificUserAssignments = specificUserAssignments;
            } else {
              // 对于"所有团队成员"和"所有非团队用户"，收集统一的样本类型
              formData.selectedSampleTypes = formData.uniformSampleTypes || [];
            }
            
            onCreate(formData);
          })
          .catch((info) => {
            console.log('Validate Failed:', info);
          });
      }}
    >
      <Form
        form={form}
        layout="horizontal"
        name="form_in_modal"
        initialValues={{
          modifier: 'public',
          targetUserType: isAdmin ? 'specificTeamUsers' : 'allNonAdminUsers', // 普通用户默认且只能选择"所有非管理员用户"
          mapSelectMode: 'byName', // 默认按影像名称选择
          score: 0, // 初始化 score
        }}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 16 }}
      >
        {taskid && (
          <Form.Item
            label="任务id"
            name="taskid"
            hidden={true}
            initialValue={taskid}
            rules={[{ required: true, message: '必须输入任务id！' }]}
          >
            <Input disabled={true} />
          </Form.Item>
        )}
        <Form.Item
          label="任务名称"
          name="taskname"
          initialValue={taskname}
          rules={[{ required: true, message: '必须输入任务名称！' }]}
        >
          <Input placeholder="请输入任务名称" />
        </Form.Item>
        <Form.Item
          label="标注类型"
          name="type"
          initialValue={type}
          rules={[{ required: true, message: '必须选择标注类型！' }]}
        >
          <Select placeholder="请选择标注类型" optionFilterProp="children" onChange={onChange}>
            <Select.Option value="目标检测" key="1">
              目标检测
            </Select.Option>
            <Select.Option value="地物分类" key="2">
              地物分类
            </Select.Option>
          </Select>
        </Form.Item>
        
        <Form.Item
          label="底图选择方式"
          name="mapSelectMode"
          initialValue="byName"
        >
          <Radio.Group onChange={handleMapSelectModeChange}>
            <Radio value="byName">按影像名称选择</Radio>
            <Radio value="bySetName">按影像集名称选择</Radio>
          </Radio.Group>
        </Form.Item>
        
        {mapSelectMode === 'byName' ? (
          <Form.Item
            label="底图服务"
            name="mapserver"
            initialValue={taskid ? [mapserver] : []}
            rules={[{ required: true, message: '必须选择底图服务！' }]}
            tooltip="可选择多个底图服务，系统将为每个底图创建独立任务，任务名称保持不变"
          >
            <Select
              mode="multiple"
              showSearch
              placeholder="底图服务"
              optionFilterProp="children"
              onChange={onChange}
              onSearch={onSearch}
              filterOption={(input, option) =>
                option.value.toLowerCase().includes(input.toLowerCase())
              }
            >
              {renderServiceList}
            </Select>
          </Form.Item>
        ) : (
          <>
            <Form.Item
              label="影像集名称"
              name="setNames"
              rules={[{ required: true, message: '必须选择影像集！' }]}
              tooltip="选择影像集将自动选择该影像集下所有底图，系统将为每个底图创建独立任务，任务名称保持不变"
            >
              <Select
                mode="multiple"
                showSearch
                placeholder="请选择影像集"
                optionFilterProp="children"
                onChange={handleSetNameChange}
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {renderSetNameOptions()}
              </Select>
            </Form.Item>
            
            <Form.Item
              label="底图服务"
              name="mapserver"
              rules={[{ required: true, message: '必须选择底图服务！' }]}
              tooltip="根据所选影像集自动选择的底图"
            >
              <Select
                mode="multiple"
                disabled
                placeholder="底图服务（由影像集自动选择）"
              />
            </Form.Item>
          </>
        )}
        
        <Form.Item
          label="任务期限"
          name="daterange"
          initialValue={[daterange?.startValue, daterange?.endValue]}
          rules={[{ required: true, message: '必须输入任务期限！' }]}
        >
          <RangePicker
            onChange={(date, dateString) => {
              console.log(date, dateString);
            }}
          />
        </Form.Item>
        
        {/* 目标用户类型选择 */}
        <Form.Item
          label="目标用户类型"
          name="targetUserType"
          initialValue={isAdmin ? targetUserType : 'allNonAdminUsers'}
          rules={[{ required: true, message: '必须选择目标用户类型！' }]}
        >
          <Select 
            placeholder="请选择目标用户类型" 
            onChange={handleTargetUserTypeChange}
            disabled={!isAdmin} // 普通用户不能更改
          >
            {isAdmin ? (
              <>
                <Select.Option value="allTeamMembers">所有团队成员</Select.Option>
                <Select.Option value="specificTeamUsers">指定团队用户</Select.Option>
                <Select.Option value="allNonTeamUsers">所有非团队用户</Select.Option>
              </>
            ) : (
              <Select.Option value="allNonAdminUsers">所有非管理员用户</Select.Option>
            )}
          </Select>
        </Form.Item>
        
        {/* 根据shouldShowScoreInput()函数判断是否显示积分输入框 */}
        {shouldShowScoreInput() && (
          <Form.Item
            label="每张影像积分"
            name="score"
            rules={[
              { required: true, message: '请输入每张影像的积分!' },
              { type: 'number', min: 0, message: '积分不能为负数!' }
            ]}
            tooltip="发布非团队任务时，设置标注每张影像完成后，标注者获得的积分。"
          >
            <InputNumber style={{ width: '100%' }} placeholder="请输入积分" />
          </Form.Item>
        )}

        {/* 统一样本类型选择（当目标用户类型不是"指定团队用户"时显示） */}
        {targetUserType !== 'specificTeamUsers' && (
          <Form.Item
            label="样本类型"
            name="uniformSampleTypes"
            rules={[{ required: true, message: '必须选择样本类型！' }]}
          >
            <Select
              mode="multiple"
              showArrow
              allowClear
              placeholder="请选择样本类型"
              options={filteredOptions.map((item) => ({
                value: item.typeId,
                label: item.typeName,
              }))}
            />
          </Form.Item>
        )}

        {/* 指定用户和对应的样本类型（当目标用户类型为"指定团队用户"时显示） */}
        {targetUserType === 'specificTeamUsers' && isAdmin && (
          <>
            <Form.Item
              label="任务受理人"
              name="userArr"
              tooltip="多人协同模式下，各成员分配的标签不可重复"
              initialValue={defaultUserArr}
              rules={[{ required: true, message: '必须选择任务受理人！' }]}
            >
              <Select
                showSearch
                mode="multiple"
                showArrow
                allowClear
                placeholder="请选择任务受理人"
                optionFilterProp="children"
                onChange={(value) => {
                  setUserList(
                    value.map((item) => {
                      return { userName: item, typestring: [] };
                    }),
                  );
                }}
                onSearch={onSearch}
                filterOption={(input, option) =>
                  option.children?.toLowerCase().includes(input.toLowerCase()) ||
                  option.label?.toLowerCase().includes(input.toLowerCase())
                }
                options={renderUserList}
              />
            </Form.Item>
            
            {userList?.map(({ userName, typestring }) => {
              return (
                <Form.Item
                  key={userName}
                  label={userName}
                  name={userName}
                  initialValue={typestring}
                  rules={[{ required: true, message: '必须指定标签！' }]}
                >
                  <Select
                    mode="multiple"
                    showArrow
                    allowClear
                    value={selectedItems}
                    onChange={(value) => {
                      console.log(value);
                    }}
                    options={filteredOptions.map((item) => ({
                      value: item.typeId,
                      label: item.typeName,
                    }))}
                  />
                </Form.Item>
              );
            })}
          </>
        )}

        {taskid && (
          <Form.Item
            label="更新id"
            name="userArrId"
            initialValue={userArrId}
            hidden={true}
            rules={[{ required: true, message: '必须选择关系id！' }]}
          >
            <Select
              showSearch
              mode="multiple"
              showArrow
              allowClear
              placeholder="请选择关系id！"
              optionFilterProp="children"
              onChange={onChange}
              onSearch={onSearch}
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};
