import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Transfer, Tabs, Button, Checkbox } from 'antd';
// tab内容
const tabChild = ({ onItemSelect, selectedKeys, onItemSelectAll, targetKeys }) => {
  console.log(onItemSelect, selectedKeys, onItemSelectAll);
  const onChange = (key, checkedValues) => {
    console.log(key, checkedValues, targetKeys, onItemSelect, onItemSelectAll);
    // onItemSelect(checkedValues, checkedValues);
  };
  return (
    <Checkbox.Group onChange={onChange}>
      {targetKeys?.map((item) => (
        <Checkbox value={item} key={item}>
          {item}
        </Checkbox>
      ))}
    </Checkbox.Group>
  );
};

const UserTransfer = ({ users, plans }) => {
  const [targetKeys, setTargetKeys] = useState(new Map());
  const [typeList, setTypeList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [currentTab, setCurrentTab] = useState();
  // 保存方案
  useEffect(() => {
    if (plans.length && users.length) {
      setTypeList(plans);
      console.log(11);
      setUserList(users);
      setCurrentTab(plans[0].typename);
    }
  }, [plans, users]);
  // useMemo会先执行一次函数
  // const renderTypeList = useMemo(() => {
  //   return typeList.map((item) => {
  //     const tempItem = { ...item };
  //     return {
  //       label: tempItem.typename,
  //       key: tempItem.typename,
  //       children: tabChild(tempItem.targetKeys),
  //     };
  //   });
  // }, [typeList]);
  // useMemo会先执行一次函数
  const renderTypeList = useCallback(
    (props) => {
      return typeList.map((item) => {
        const tempItem = { ...item };
        return {
          label: tempItem.typename,
          key: tempItem.typename,
          children: tabChild({ targetKeys: tempItem.targetKeys, ...props }),
        };
      });
    },
    [typeList],
  );
  // 穿梭回调
  const handleChange = (nextTargetKeys) => {
    console.log(nextTargetKeys, '穿梭');
    const nextTypeList = typeList.map((item) => {
      const tempItem = { ...item };
      if (tempItem.typename == currentTab) {
        return { ...tempItem, targetKeys: nextTargetKeys };
      }
      return { ...tempItem };
    });
    setTypeList(nextTypeList);
    setTargetKeys((prevMap) => {
      const newMap = new Map(prevMap);
      newMap.set(currentTab, nextTargetKeys);
      return newMap;
    });
  };

  // 每行渲染规则回调
  const renderItem = useCallback((item) => item.value, []);
  // 切换tab回调
  const tabChange = useCallback((key) => {
    setCurrentTab(key);
  }, []);

  return (
    <Transfer
      dataSource={userList}
      targetKeys={targetKeys.get(currentTab)}
      onChange={handleChange}
      render={renderItem}
      showSelectAll={false}
      style={{ height: 300 }}
      rowKey={(record) => record.label}
    >
      {/* 自定义渲染 */}
      {({ direction, onItemSelect, selectedKeys, onItemSelectAll }) => {
        if (direction === 'right') {
          // 右边
          return (
            <Tabs
              activeKey={currentTab}
              items={renderTypeList(onItemSelect, selectedKeys, onItemSelectAll)}
              style={{ marginLeft: 10, width: 300 }}
              onChange={tabChange}
            />
          );
        } else {
          // 左边
          // console.log(selectedKeys, '左边选择用户组');
          // console.log(onItemSelectAll, 'onItemSelectAll');
          // console.log(onItemSelect, 'onItemSelect');
        }
      }}
    </Transfer>
  );
};

export default UserTransfer;
