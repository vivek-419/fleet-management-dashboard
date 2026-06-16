pipeline {
    agent any

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

        stage('Success') {
            steps {
                echo 'Fleet Dashboard CI Pipeline Successful'
            }
        }
    }
}
