export const SocketEvents = {
  RideOffer: 'ride:offer',
  RideOfferClosed: 'ride:offer_closed',
  RideOfferRespond: 'ride:offer:respond',
  RideStatus: 'ride:status',
  RideDriverLocation: 'ride:driver_location',
  RideNoDriverFound: 'ride:no_driver_found',

  ReservationOffer: 'reservation:offer',
  ReservationOfferClosed: 'reservation:offer_closed',
  ReservationOfferRespond: 'reservation:offer:respond',
  ReservationStatus: 'reservation:status',

  DriverLocationUpdate: 'driver:location:update',
  DriverAvailability: 'driver:availability',
} as const;
