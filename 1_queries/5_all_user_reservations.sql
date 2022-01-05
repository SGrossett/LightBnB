SELECT properties.*, reservations.*, AVG(rating) as average_rating
  FROM properties
  JOIN reservations ON reservations.property_id = properties.id
  JOIN users ON guest_id = users.id
  JOIN property_reviews ON property_reviews.property_id = properties.id
  WHERE users.id = 1 AND end_date < now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY start_date
  LIMIT 10;