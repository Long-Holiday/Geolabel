# models/svm.py
from sklearn.svm import SVC

class SVM:
    def __init__(self, num_classes):
        self.model = SVC(kernel='rbf', probability=True)
        self.num_classes = num_classes

    def train(self, X, y):
        self.model.fit(X, y)

    def predict(self, X):
        return self.model.predict(X)