import { reqGetCategoryList } from '@/services/category/api';
import { message } from 'antd';
import { useState, useCallback, useEffect } from 'react';

export default function typeModel() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [typeList, setTypeList] = useState([]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const getTypeInfo = useCallback(async () => {
    try {
      let result = await reqGetCategoryList();
      //标注类别列表
      if (result.success) {
        setTypeList(result.data);
      }
    } catch (error) {
      message.error('获取类别列表失败！');
      console.log(error);
    }
  });

  return {
    getTypeInfo,
    typeList,
  };
}
