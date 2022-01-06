const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool ({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  console.log('In getUserWithEmail');

  return pool
    .query(`SELECT * FROM users WHERE email = $1`, [email])
    .then((result) => //result.rows ? result.rows : null 
    {
      console.log('result.rows[0]:', result.rows[0])
      return result.rows[0]
    }
    )
    .catch((err) => console.log('Error:', err.message) );
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {

  console.log('In getUserByID');

  return pool
    .query(`SELECT * FROM users WHERE id = $1`, [id])
    .then((result) => //result.rows[0] ? result.rows[0] : null
    {
      console.log('result.rows:', result.rows[0])
      return result.rows[0]
    }
    )
    .catch((err) => console.log('Error:', err.message) );
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  
  console.log('In addUser');

  return pool
    .query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *`, [user.name, user.email, user.password])
    .then((result) =>  result.rows[0])
    .catch((err) => console.log('Error:', err.message) );
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
 const getAllReservations = function(guest_id, limit = 10) {
   
  console.log('In Reservations');

  return pool
  .query(`
  SELECT properties.*, reservations.*, AVG(rating) as average_rating
  FROM properties
  JOIN reservations ON reservations.property_id = properties.id
  JOIN users ON guest_id = users.id
  JOIN property_reviews ON property_reviews.property_id = properties.id
  WHERE reservations.guest_id = $1 AND end_date < now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY start_date
  LIMIT $2
  `, [guest_id, limit])
  .then((result) => result.rows)
  .catch((err) => err.message);
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  // An arry to hold any parameters that may be available for the query
  const values = [];
  let connect = '';
  console.log('In allProperties')

  // All the information that comes before the WHERE clause
  let queryString = `
  SELECT properties.*, AVG(property_reviews.rating) AS average_rating
  FROM properties
  JOIN property_reviews ON property_id = properties.id
  `;
  console.log('In getProperties');

  // Check if a city, owner_id, min or max price/night, or minimum_rating has been passed in as an option.
  // Add the city to the params array and create a WHERE clause for the city.
  if (options.city) {
    values.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${values.length} `;
  }

  if (options.owner_id) {
    values.push(options.owner_id);

    values.length > 0 ? connect = 'AND' : connect = 'WHERE';
    queryString += `${connect} owner_id = $${values.length}`;

    // if (values.length > 0) {
    //   queryString += `AND owner_id = $${values.length}`;
    // } else {
    //   queryString += `WHERE owner_id = $${values.length}`;
    // }
  }

  if (options.minimum_price_per_night) {
    values.push(options.minimum_price_per_night)

    values.length > 0 ? connect = 'AND' : connect = 'WHERE';
    queryString += `${connect} minimum_price_per_night >= $${values.length}`;

    // if (values.length > 0) {
    //   queryString += `AND minimum_price_per_night >= $${values.length}`;
    // } else {
    //   queryString += `WHERE minimum_price_per_night >= $${values.length}`;
    // }
  }

  if (options.maximum_price_per_night) {
    values.push(options.maximum_price_per_night)

    values.length > 0 ? connect = 'AND' : connect = 'WHERE';
    queryString += `${connect} maximum_price_per_night <= $${values.length}`;

    // if (values.length > 0) {
    //   queryString += `AND maximum_price_per_night <= $${values.length}`;
    // } else {
    //   queryString += `WHERE maximum_price_per_night <= $${values.length}`;
    // }
  }

  if (options.minimum_rating) {
    values.push(options.minimum_rating)

    values.length > 0 ? connect = 'AND' : connect = 'WHERE';
    queryString += `${connect} rating >= $${values.length}`;

    // if (values.length > 0) {
    //   queryString += `AND minimum_rating >= $${values.length}`;
    // } else {
    //   queryString += `WHERE minimum_rating >= $${values.length}`;
    // }
  }
  
  // Add any query that comes after the WHERE clause.
  values.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${values.length};
  `;

  console.log(queryString, values);

  return pool
    .query(queryString, values)
    .then((result) => { console.log('result.rows:', result.rows); return result.rows})
    .catch((err) => console.log('Error:', err.message) );
}
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyDetails = [
    property.owner_id,
    property.title,
    property.description,
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.cost_per_night,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms,
    property.country,
    property.street,
    property.city,
    property.province,
    property.post_code
  ];
  console.log('In addProperties');

  return pool
    .query(`
    INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, parking_spaces, number_of_bathrooms, number_of_bedrooms, country, street, city, province, post_code) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
    `, propertyDetails)
    .then((result) => { console.log('result.rows:', result.rows); return result.rows})
    .catch((err) => console.log('Error:', err.message) );
}
exports.addProperty = addProperty;