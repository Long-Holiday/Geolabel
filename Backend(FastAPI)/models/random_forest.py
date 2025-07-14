# models/random_forest.py
from sklearn.ensemble import RandomForestClassifier

class RandomForest:
    def __init__(self, num_classes):
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.num_classes = num_classes

    def train(self, X, y):
        self.model.fit(X, y)

    def predict(self, X):
        return self.model.predict(X)