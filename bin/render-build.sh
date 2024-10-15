set -o errexit

bundle install
bundle exec rake assets:precompile
bundle exec rake assets:clean
DISABLE_DATABASE_ENVIRONMENT_CHECK=1 bundle exec rake db:migrate:reset
