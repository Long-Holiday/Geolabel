import { Avatar, Card, Col, Skeleton, Row, Statistic, Tag, Typography, Tabs, Button, message } from 'antd';
import { Pie } from '@ant-design/charts';
import { Link, useModel } from 'umi';
import { PageContainer } from '@ant-design/pro-layout';
import { ReloadOutlined } from '@ant-design/icons';
import moment from 'moment';
import styles from './style.less';
import { useEffect, useState } from 'react';
import { reqGetPersonalTaskList, reqGetTaskList } from '@/services/taskManage/api';
import { currentState as getCurrentUserInfo } from '@/services/login/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const PageHeaderContent = ({ currentUser }) => {
  const loading = currentUser && Object.keys(currentUser).length;
  if (!loading) {
    return <Skeleton avatar paragraph={{ rows: 1 }} active />;
  }
  return (
    <div className={styles.pageHeaderContent}>
      <div className={styles.avatar}>
        <Avatar size="large" src={currentUser.avatar} />
      </div>
      <div className={styles.content}>
        <div className={styles.contentTitle}>
          你好，
          {currentUser.name}
          ，欢迎登录CoLabel！
        </div>
        <div>
          遥感样本标注平台 | 协作标注
        </div>
      </div>
    </div>
  );
};

const ExtraContent = ({ currentUser, onRefreshScore }) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshScore = async () => {
    setRefreshing(true);
    try {
      await onRefreshScore();
      message.success('积分刷新成功');
    } catch (error) {
      message.error('积分刷新失败，请重试');
      console.error('刷新积分失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className={styles.extraContent}>
      <div className={styles.statItem} style={{ padding: '0 40px' }}>
        <Statistic 
          title={
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              fontSize: '16px',
              fontWeight: '500',
              flexWrap: 'wrap'
            }}>
              <span>我的积分</span>
              <Button
                type="text"
                size="middle"
                icon={<ReloadOutlined style={{ fontSize: '14px' }} />}
                loading={refreshing}
                onClick={handleRefreshScore}
                style={{ 
                  padding: '4px 8px',
                  height: '32px',
                  fontSize: '14px',
                  color: '#1890ff',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  backgroundColor: '#fafafa',
                  transition: 'all 0.3s ease',
                  minWidth: '70px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e6f7ff';
                  e.target.style.borderColor = '#1890ff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#fafafa';
                  e.target.style.borderColor = '#d9d9d9';
                }}
                title="刷新积分"
              >
                刷新
              </Button>
            </div>
          }
          value={typeof currentUser?.score === 'number' ? currentUser.score : 0}
          valueStyle={{ 
            fontSize: '36px', 
            fontWeight: 'bold',
            color: '#1890ff',
            lineHeight: '44px'
          }}
          suffix={
            <span style={{ 
              fontSize: '18px', 
              color: '#8c8c8c',
              marginLeft: '8px',
              fontWeight: 'normal'
            }}>
              分
            </span>
          }
        />
      </div>
    </div>
  );
};

const Workplace = () => {
  const {
    initialState: { currentState },
    setInitialState,
  } = useModel('@@initialState');
  const [taskList, setTaskList] = useState([]);
  const [taskStatusData, setTaskStatusData] = useState([]);
  const [createdTaskStatusData, setCreatedTaskStatusData] = useState([]);
  const [assignedTaskStatusData, setAssignedTaskStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('created');

  // 确保获取到currentUser和isAdmin
  const currentUser = currentState?.currentUser || '';
  const isAdmin = currentState?.isAdmin || false;

  // 刷新积分功能
  const refreshUserScore = async () => {
    try {
      const userInfo = await getCurrentUserInfo();
      if (userInfo) {
        // 更新全局状态中的用户信息
        setInitialState((s) => ({ 
          ...s, 
          currentState: userInfo 
        }));
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  };

  // 处理任务状态统计的通用函数
  const processTaskStatusData = (taskData) => {
    const statusCounts = {
      '审核中': 0,
      '审核通过': 0,
      '审核未通过': 0,
      '未提交': 0,
    };

    taskData.forEach(task => {
      console.log('Processing task:', task);
      if (task.status !== undefined && task.status !== null) {
        const status = parseInt(task.status);
        console.log('Task status parsed:', status);

        switch (status) {
          case 0:
            statusCounts['审核中']++;
            break;
          case 1:
            statusCounts['审核通过']++;
            break;
          case 2:
            statusCounts['审核未通过']++;
            break;
          case 3:
            statusCounts['未提交']++;
            break;
          default:
            statusCounts['未提交']++;
            break;
        }
      } else {
        console.log('Task status undefined for task:', task);
        statusCounts['未提交']++;
      }
    });

    console.log('Status counts:', statusCounts);

    // 转换为图表数据
    const chartData = Object.entries(statusCounts)
      .filter(([_, value]) => value > 0)
      .map(([type, value]) => ({
        type,
        value,
      }));

    console.log('Final chart data:', chartData);
    return chartData;
  };

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        if (isAdmin) {
          // 管理员：获取创建的任务
          const params = {
            userArr: currentUser,
            isAdmin: 1,
            pageSize: 1000
          };

          const result = await reqGetTaskList(params);

          if (result.code == 200) {
            const taskData = Array.isArray(result.data) ? result.data : [];
            setTaskList(taskData);

            if (taskData.length > 0) {
              const chartData = processTaskStatusData(taskData);
              setTaskStatusData(chartData);
            } else {
              setTaskStatusData([]);
            }
          } else {
            console.log('API request returned error code:', result.code);
            setTaskList([]);
            setTaskStatusData([]);
          }
        } else {
          // 普通用户：获取创建的任务和分配的任务
          const [createdResult, assignedResult] = await Promise.all([
            // 获取用户创建的任务
            reqGetTaskList({
              userArr: currentUser,
              isAdmin: 0,
              pageSize: 1000
            }),
            // 获取分配给用户的任务
            reqGetPersonalTaskList({
              userArr: currentUser,
              pageSize: 1000
            })
          ]);

          let createdChartData = [];
          let assignedChartData = [];

          // 处理创建的任务
          if (createdResult.code == 200) {
            const createdTaskData = Array.isArray(createdResult.data) ? createdResult.data : [];
            if (createdTaskData.length > 0) {
              createdChartData = processTaskStatusData(createdTaskData);
            }
          }
          setCreatedTaskStatusData(createdChartData);

          // 处理分配的任务
          if (assignedResult.code == 200) {
            const assignedTaskData = Array.isArray(assignedResult.data) ? assignedResult.data : [];
            setTaskList(assignedTaskData); // 首页项目列表显示分配的任务
            
            if (assignedTaskData.length > 0) {
              assignedChartData = processTaskStatusData(assignedTaskData);
            }
          } else {
            setTaskList([]);
          }
          setAssignedTaskStatusData(assignedChartData);

          // 默认显示创建的任务统计
          setTaskStatusData(createdChartData);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setTaskList([]);
        setTaskStatusData([]);
        setCreatedTaskStatusData([]);
        setAssignedTaskStatusData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [currentUser, isAdmin]);

  // 处理标签页切换
  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === 'created') {
      setTaskStatusData(createdTaskStatusData);
    } else {
      setTaskStatusData(assignedTaskStatusData);
    }
  };

  // 渲染任务状态统计图表
  const renderTaskStatusChart = () => {
    if (loading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '300px'
        }}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      );
    }

    if (taskStatusData.length > 0) {
      return (
        <div className={styles.chartContainer}>
          <Pie
            data={taskStatusData}
            angleField="value"
            colorField="type"
            radius={0.75}
            height={280}
            label={{
              type: 'outer',
              content: '{name}: {percentage}',
              style: {
                fontSize: 12,
                textAlign: 'center',
              },
            }}
            legend={{
              position: 'bottom',
              itemName: {
                style: {
                  fontSize: 12,
                },
              },
            }}
            tooltip={{
              formatter: (datum) => {
                return { name: datum.type, value: `${datum.value} 个任务` };
              },
            }}
            interactions={[
              {
                type: 'element-active',
              },
            ]}
            color={['#1890ff', '#52c41a', '#faad14', '#f5222d']}
          />
        </div>
      );
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '300px',
        color: '#8c8c8c'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <Text type="secondary">暂无任务数据</Text>
      </div>
    );
  };

  const titles = [
    'Alipay',
    'Angular',
    'Ant Design',
    'Ant Design Pro',
    'Bootstrap',
    'React',
    'Vue',
    'Webpack',
  ];
  const avatars = [
    'https://gw.alipayobjects.com/zos/rmsportal/WdGqmHpayyMjiEhcKoVE.png', // Alipay
    'https://gw.alipayobjects.com/zos/rmsportal/zOsKZmFRdUtvpqCImOVY.png', // Angular
    'https://gw.alipayobjects.com/zos/rmsportal/dURIMkkrRFpPgTuzkwnB.png', // Ant Design
    'https://gw.alipayobjects.com/zos/rmsportal/sfjbOqnsXXJgNCjCzDBL.png', // Ant Design Pro
    'https://gw.alipayobjects.com/zos/rmsportal/siCrBXXhmvTQGWPNLBow.png', // Bootstrap
    'https://gw.alipayobjects.com/zos/rmsportal/kZzEzemZyKLKFsojXItE.png', // React
    'https://gw.alipayobjects.com/zos/rmsportal/ComBAopevLwENQdKWiIn.png', // Vue
    'https://gw.alipayobjects.com/zos/rmsportal/nxkuOJlFJuAUhzlMTCEe.png', // Webpack
  ];
  const projectNotice = [
    {
      id: 'xxx1',
      title: titles[0],
      logo: avatars[0],
      description: '那是一种内在的东西，他们到达不了，也无法触及的',
      updatedAt: new Date(),
      member: '科学搬砖组',
      href: '',
      memberLink: '',
    },
    {
      id: 'xxx2',
      title: titles[1],
      logo: avatars[1],
      description: '希望是一个好东西，也许是最好的，好东西是不会消亡的',
      updatedAt: new Date('2017-07-24'),
      member: '全组都是吴彦祖',
      href: '',
      memberLink: '',
    },
    {
      id: 'xxx3',
      title: titles[2],
      logo: avatars[2],
      description: '城镇中有那么多的酒馆，她却偏偏走进了我的酒馆',
      updatedAt: new Date(),
      member: '中二少女团',
      href: '',
      memberLink: '',
    },
    {
      id: 'xxx4',
      title: titles[3],
      logo: avatars[3],
      description: '那时候我只会想自己想要什么，从不想自己拥有什么',
      updatedAt: new Date('2017-07-23'),
      member: '程序员日常',
      href: '',
      memberLink: '',
    },
    {
      id: 'xxx5',
      title: titles[4],
      logo: avatars[4],
      description: '凛冬将至',
      updatedAt: new Date('2017-07-23'),
      member: '高逼格设计天团',
      href: '',
      memberLink: '',
    },
    {
      id: 'xxx6',
      title: titles[5],
      logo: avatars[5],
      description: '生命就像一盒巧克力，结果往往出人意料',
      updatedAt: new Date('2017-07-23'),
      member: '骗你来学计算机',
      href: '',
      memberLink: '',
    },
  ];
  return (
    <PageContainer
      content={
        <PageHeaderContent
          currentUser={{
            avatar: 'https://gw.alipayobjects.com/zos/rmsportal/BiazfanxmamNRoxxVxka.png',
            name: currentUser
          }}
        />
      }
      extraContent={<ExtraContent 
        currentUser={{ score: parseInt(currentState?.score) || 0 }} 
        onRefreshScore={refreshUserScore}
      />}
    >
      <Row gutter={[24, 24]}>
        {/* 进行中的项目 */}
        <Col span={16}>
          <Card
            className={styles.projectList}
            title={
              <Title level={3} style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                进行中的项目
              </Title>
            }
            bordered={false}
            extra={<Link to="/taskmanage" style={{ fontSize: '14px' }}>全部项目</Link>}
            loading={loading}
            bodyStyle={{ padding: '16px' }}
          >
            {taskList && taskList.length > 0 ? (
              <Row gutter={[16, 16]}>
                {taskList.map((item) => (
                  <Col span={12} key={item.taskid}>
                    <Card
                      hoverable
                      className={styles.projectCard}
                      bodyStyle={{ padding: '16px' }}
                      style={{
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <Card.Meta
                        title={
                          <div className={styles.cardTitle}>
                            <Link
                              to={'/taskmanage'}
                              style={{
                                fontSize: '16px',
                                fontWeight: 500,
                                color: '#262626'
                              }}
                            >
                              {item.taskname}
                            </Link>
                          </div>
                        }
                        description={
                          <div style={{ marginTop: '8px' }}>
                            <Tag
                              color={item.type == '地物分类' ? '#87d068' : '#108ee9'}
                              style={{ fontSize: '12px', padding: '2px 8px' }}
                            >
                              {item.type}
                            </Tag>
                            <div style={{ marginTop: '8px', color: '#8c8c8c', fontSize: '12px' }}>
                              创建时间: {moment(item.createtime).format('YYYY-MM-DD')}
                            </div>
                          </div>
                        }
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#8c8c8c',
                fontSize: '14px'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                暂无进行中的项目
              </div>
            )}
          </Card>
        </Col>

        {/* 任务状态统计 */}
        <Col span={8}>
          <Card
            title={
              <Title level={3} style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                任务状态统计
              </Title>
            }
            bordered={false}
            bodyStyle={{ padding: '16px' }}
            style={{ height: '100%' }}
          >
            {isAdmin ? (
              // 管理员：直接显示创建的任务统计
              renderTaskStatusChart()
            ) : (
              // 普通用户：显示标签页
              <Tabs 
                activeKey={activeTab} 
                onChange={handleTabChange}
                size="small"
                style={{ height: '100%' }}
              >
                <TabPane tab="我创建的" key="created">
                  {renderTaskStatusChart()}
                </TabPane>
                <TabPane tab="分配给我的" key="assigned">
                  {renderTaskStatusChart()}
                </TabPane>
              </Tabs>
            )}
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default Workplace;
