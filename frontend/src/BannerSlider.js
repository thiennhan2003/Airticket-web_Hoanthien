import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./App.css";

function BannerSlider() {
  const banners = [
    { id: 1, img: "https://images.vietnamtourism.gov.vn/vn/images/2020/dlonl1.png", title: "Khám phá Việt Nam" },
    { id: 2, img: "https://ik.imagekit.io/tvlk/blog/2022/02/dia-diem-du-lich-viet-nam-cover.jpeg?tr=q-70,c-at_max,w-500,h-250,dpr-2", title: "Điểm đến lý tưởng" },
    { id: 3, img: "https://marketingai.mediacdn.vn/wp-content/uploads/2018/06/banner-du-lich-da-lat_113653910-compressed.jpg", title: "Du lịch Đà Lạt" },
  ];

  const settings = {
    dots: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 2500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false, // tắt mũi tên nếu muốn
  };

  return (
    <div className="banner-container">
      <Slider {...settings}>
        {banners.map((banner) => (
          <div key={banner.id} className="banner-slide">
            <img src={banner.img} alt={banner.title} className="banner-img" />
            <div className="banner-caption">{banner.title}</div>
          </div>
        ))}
      </Slider>
    </div>
  );
}

export default BannerSlider;
