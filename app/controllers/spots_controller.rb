class SpotsController < ApplicationController
  def new
    @spot = Spot.new
  end

  def save_spot_data
    @spot = Spot.new(spot_params)
    @spot.photo.attach(params[:spot][:photo])

    if @spot.save!
      render json: { message: 'データが保存されました', spot: @spot }, status: :ok
    end
  end

  def update_spot_data
    @spot = Spot.find(params[:id])
    @spot.update!(spot_params)
    @spot.photo.attach(params[:spot][:photo]) if params[:spot][:photo]
  end


  def get_spot_data
    #必要無くなった
    @spot = Spot.find_by(latitude: params[:lat], longitude: params[:lng])
    if @spot
      # URLを取得
      photo_url = @spot.photo.attached? ? url_for(@spot.photo) : nil
      render json: { name: @spot.name, review: @spot.review, photo: photo_url }, status: :ok
    else
      render json: { message: "Not Found" }, status: :not_found
    end
  end

  private
  def spot_params
    params.require(:spot).permit(:latitude, :longitude, :photo, :name, :review).merge(user_id: current_user.id)
  end
end
