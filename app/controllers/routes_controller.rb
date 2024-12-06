require "google_maps_service/polyline"

class RoutesController < ApplicationController
  skip_before_action :require_login, only: %i[ new ]

  def new
    @user = current_user
    gon.user = @user
    @spot = Spot.new
    spots = Spot.all
    gon.spots = spots
    gon.map_api_key = ENV["MAP_API_KEY"]

    routes = Route.where(user_id: @user.id) if @user
    pathValues = []
    if routes.present?
      routes.each do |route|
        path = GoogleMapsService::Polyline.decode(route.path)
        pathValues.push(path)
      end
      gon.mypathValues = pathValues
    end
  end

  def create
    # {"lat":35.681236, "lng":139.767125}のようなJSON形式を受け取る
    user = current_user
    pathValues = params[:_json]
    polylines = []
    latlng = []

    pathValues.each do |path|
      latlng = [ path["lat"], path["lng"] ]
      polylines.push(latlng)
    end
    encoded_path = GoogleMapsService::Polyline.encode(polylines)

    path = Route.new(path: encoded_path, user_id: user.id)
    path.save!
  end

  def destroy
    user = current_user
    pathValues = params[:_json]
    polylines = []
    latlng = []

    pathValues.each do |path|
      latlng = [ path["lat"], path["lng"] ]
      polylines.push(latlng)
    end
    encoded_path = GoogleMapsService::Polyline.encode(polylines)

    path = Route.find_by(path: encoded_path, user_id: user.id)
    path.destroy!
  end

  private
  def route_params
    params.permit(:_json)
  end
end
