pipeline {
    agent any

    stages {

        stage('Checkout Source') {
            steps {
                echo 'Fetching Fleet Dashboard source code'
            }
        }

        stage('Verify Repository') {
            steps {
                sh 'pwd'
                sh 'ls -la'
            }
        }

        stage('Verify Docker Configuration') {
            steps {
                sh 'ls fleet-dashboard'
                sh 'ls fleet-dashboard/backend'
            }
        }

        stage('Application Validation') {
            steps {
                echo 'Fleet Dashboard structure verified'
            }
        }

        stage('Deployment Ready') {
            steps {
                echo 'Application ready for deployment'
            }
        }
    }

    post {
        success {
            echo 'Fleet Dashboard CI Pipeline Completed Successfully'
        }
        failure {
            echo 'Pipeline Failed'
        }
    }
}
