pipeline {
    agent any

    environment {
        RAILWAY_TOKEN = credentials('railway_api_token')
        DOCKER_REGISTRY = "docker.io/jorenzo"
        APP_NAME = "datadrip"
        RAILWAY_SERVICE = "datadrip"  // Make service name configurable
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'CICD-act',
                    url: 'https://github.com/JorenzoReyes/datadrip'
            }
        }

        stage('Build') {
            steps {
                bat 'npm install'
                bat 'npm run build'
                bat 'npm install -g @railway/cli'
            }
        }

        stage('Unit Test') {
            steps {
                bat 'npm test'
            }
        }

        stage('Railway Setup') {
            steps {
                script {
                    try {
                        // Login to Railway using token
                        bat '''
                            echo %RAILWAY_TOKEN% | npx railway login
                        '''
                        
                        // Check if service exists, create if it doesn't
                        bat '''
                            npx railway service list | findstr %RAILWAY_SERVICE% || (
                                echo "Service %RAILWAY_SERVICE% not found, creating..."
                                npx railway service create %RAILWAY_SERVICE%
                            )
                        '''
                    } catch (Exception e) {
                        echo "Railway setup failed: ${e.getMessage()}"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }

        stage('Deploy to Test Environment') {
            steps {
                script {
                    try {
                        bat 'echo "Deploying to Railway..."'
                        bat 'npx railway up --service %RAILWAY_SERVICE% --detach'
                    } catch (Exception e) {
                        echo "Deployment failed: ${e.getMessage()}"
                        currentBuild.result = 'FAILURE'
                        error "Deployment to Railway failed"
                    }
                }
            }
        }

        stage('Integration Test') {
            when {
                expression { currentBuild.result == 'SUCCESS' }
            }
            steps {
                bat 'echo "Running integration tests..."'
                bat 'npm run test:integration'
            }
        }

        stage('Build Docker Image') {
            when {
                expression { currentBuild.result == 'SUCCESS' }
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                    bat '''
                        docker build -t %DOCKER_REGISTRY%/%APP_NAME%:%BUILD_NUMBER% .
                        echo %DOCKER_PASSWORD% | docker login -u %DOCKER_USERNAME% --password-stdin
                        docker push %DOCKER_REGISTRY%/%APP_NAME%:%BUILD_NUMBER%
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline finished successfully!"
        }
        failure {
            echo "❌ Pipeline failed!"
        }
        always {
            // Cleanup if needed
            echo "Pipeline completed with result: ${currentBuild.result}"
        }
    }
}
