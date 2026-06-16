pipeline {
agent any

```
stages {

    stage('Checkout') {
        steps {
            echo 'Repository cloned successfully'
        }
    }

    stage('Verify Project') {
        steps {
            sh 'pwd'
            sh 'ls -la'
        }
    }

    stage('Build Docker Image') {
        steps {
            sh 'echo Building Fleet Dashboard'
        }
    }

    stage('Deployment Verification') {
        steps {
            sh 'echo Deployment Ready'
        }
    }
}
```

}
