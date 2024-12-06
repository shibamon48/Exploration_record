Rails.application.routes.draw do
  resources :users, only: %i[new edit create update destroy]
  root "tops#index"

  resource :route, only: %i[new index create destroy]
  post "save_spot_data" => "spots#save_spot_data"
  patch "update_spot_data/:id" => "spots#update_spot_data"
  get "get_spot_data" => "spots#get_spot_data"
  delete "delete_spot_data/:id" => "spots#delete_spot_data"

  get "login" => "user_sessions#new", :as => :login
  post "login" => "user_sessions#create"
  delete "logout" => "user_sessions#destroy", :as => :logout

  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/*
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest

  # Defines the root path route ("/")
  # root "posts#index"
end
