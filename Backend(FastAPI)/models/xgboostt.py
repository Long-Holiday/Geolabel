# models/xgboost.py
import xgboost as xgb
import numpy as np

class XGBoost:
    def __init__(self, num_classes, num_round):
        self.num_classes = num_classes
        self.num_round = num_round
        self.model = None
        self.params = {
            'objective': 'multi:softmax',
            'num_class': self.num_classes,
            'tree_method': 'hist',
            'device': 'cuda',  # 使用 GPU 加速
            'max_depth': 6,
            'eta': 0.1,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'eval_metric': 'mlogloss',
            'verbosity': 1,  # 减少输出信息
            # 'gpu_id': 0,  # 指定 GPU ID
            'predictor': 'gpu_predictor'  # 使用 GPU 预测器
        }

    def train(self, X, y):
        """
        使用XGBoost官方API训练模型
        
        参数:
            X: 特征矩阵
            y: 标签向量
        """
        print("开始训练 XGBoost 模型...")
        
        # 创建DMatrix对象，启用GPU
        dtrain = xgb.DMatrix(X, label=y)
        
        # 训练模型
        self.model = xgb.train(
            params=self.params,
            dtrain=dtrain,
            num_boost_round=self.num_round,
            verbose_eval=max(1, self.num_round // 10)  # 动态调整输出频率
        )
        
        # 输出特征重要性（前10个）
        if self.model is not None:
            try:
                importance = self.model.get_score(importance_type='gain')
                print("前10个重要特征:")
                for feature, score in sorted(importance.items(), key=lambda x: x[1], reverse=True)[:10]:
                    print(f"  特征 {feature}: {score:.4f}")
            except Exception as e:
                print(f"获取特征重要性时出错: {e}")
                
        print("XGBoost 训练完成!")

    def predict(self, X):
        """
        使用XGBoost官方API进行GPU预测
        
        参数:
            X: 特征矩阵
            
        返回:
            预测的类别标签
        """
        if self.model is None:
            raise ValueError("模型未训练，请先调用 train 方法。")
        
        # 创建DMatrix对象，启用GPU
        dtest = xgb.DMatrix(X)
        
        # 进行GPU预测
        preds = self.model.predict(dtest)
        
        # 返回整数类型的预测结果
        return preds.astype(int)
        
    def get_model_info(self):
        """获取模型信息"""
        if self.model is None:
            return "模型未训练"
        
        return {
            'num_classes': self.num_classes,
            'num_boost_round': self.num_round,
            'tree_method': self.params.get('tree_method', 'unknown'),
            'device': self.params.get('device', 'unknown')
        }