const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Serve static files (HTML, CSS, etc)
app.use(express.static('public', { index: 'LIUhonors_serverside.html' }));


// Path to the reservations JSON file
const reservationsFilePath = path.join(__dirname, 'reservations.json');

const roomNumbers = [312,313,314];


// Function to validate the reservation
function validateReservation(reservation) {
  //console.log('Running Validation function')
  // Validate ID from the JSON file
  const validEmails = require('./fakeValidEmails.json').map(entry => entry.email.toUpperCase());
  if (!validEmails.includes(reservation.email.toUpperCase())) {
    return { success: false, message: 'Invalid email' };
  }

  if (!roomNumbers.includes(reservation.room)) {
    return { success: false, message: 'Invalid room number' };
  }

  // Validate reservation time
  const now = new Date();
  const reservationTime = new Date(reservation.date + 'T' + reservation.time);
  if (reservationTime < now || reservationTime > new Date(now.getTime() + 48 * 60 * 60 * 1000)) {
    return { success: false, message: 'Invalid reservation time' };
  }

  // Load existing reservations
  let reservations = [];
  if (fs.existsSync(reservationsFilePath)) {
    reservations = require(reservationsFilePath);
  }

reservationToday=false;
  const conflictingReservation = reservations.find((r) => {
  const startTimeExisting = new Date(r.date + 'T' + r.time);
  const endTimeExisting = new Date(startTimeExisting.getTime() + r.duration * 60 * 1000);

  const startTimeNew = new Date(reservation.date + 'T' + reservation.time);
  const endTimeNew = new Date(startTimeNew.getTime() + reservation.duration * 60 * 1000);

  // Check if the room and date are the same and if the time ranges overlap
  const roomAndDateOverlap = r.room === reservation.room && r.date === reservation.date &&
      ((startTimeNew >= startTimeExisting && startTimeNew < endTimeExisting) ||
      (endTimeNew > startTimeExisting && endTimeNew <= endTimeExisting) ||
      (startTimeNew <= startTimeExisting && endTimeNew >= endTimeExisting));

  // Check if the email matches and if there's at least 6 hours between reservations
  const emailOverlap = r.email === reservation.email &&
      Math.abs(startTimeNew - endTimeExisting) < 6 * 60 * 60 * 1000;

  if (emailOverlap){reservationToday=true}

  // Return true if there's overlap either in room/date or email within the specified time frame
  return roomAndDateOverlap || emailOverlap;
});




  if (conflictingReservation) {
    if(reservationToday){return { success: false, message: 'You already have a reservation today! \nYou must have 6 hours between the end of your current reservation and the new time/date' };}
    return { success: false, message: 'Room already reserved for the selected time' };
  }

  return { success: true, message: 'Reservation successful' };
}

// API endpoint for making a reservation
app.post('/reserve', (req, res) => {
  //console.log('Running Reserve API')
  //console.log(req.body);
  const reservation = req.body;

  const validation = validateReservation(reservation);

  if (validation.success) {
    // Save the reservation
    let reservations = [];
    if (fs.existsSync(reservationsFilePath)) {
      reservations = require(reservationsFilePath);
    }

    reservations.push(reservation);

    fs.writeFileSync(reservationsFilePath, JSON.stringify(reservations, null, 2));

    res.json({ success: true, message: 'Reservation successful' });
  } else {
    res.json(validation);
  }
});

//TODO: Hash passwords 
// API endpoint for removing a reservation
app.delete('/unreserve', (req, res) => {
  //console.log('Running unReserve API')
  const { email, password, name, room, date, time, duration } = req.body;

  let reservations = [];
  if (fs.existsSync(reservationsFilePath)) {
    reservations = require(reservationsFilePath);
  }
  // Find the index of the reservation with the same details
  const index = reservations.findIndex(r => r.email === email && r.password === password && r.name === name && r.room === room && r.date === date && r.time === time && r.duration === duration);

  if (index !== -1) {
      // Remove the reservation from the reservations array
      reservations.splice(index, 1);

      // Write the updated reservations array back to the JSON file or database
      fs.writeFileSync(reservationsFilePath, JSON.stringify(reservations, null, 2));

      res.json({ success: true, message: 'Reservation removed successfully' });
  } else {
      res.status(404).json({ success: false, message: 'Reservation not found or unable to be removed' });
  }
});

// Function to delete old reservations more than 2 days old
function deleteOldReservations() {
  let reservations = [];
  if (fs.existsSync(reservationsFilePath)) {
    reservations = require(reservationsFilePath);
  }
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2); // Subtract 2 days from the current date

  // Filter reservations older than two days
  const updatedReservations = reservations.filter(r => new Date(r.date) > twoDaysAgo);

  // Update reservations array with the filtered reservations
  reservations = updatedReservations;

  // Write the updated reservations array back to the JSON file or database
  fs.writeFileSync(reservationsFilePath, JSON.stringify(reservations, null, 2));

  console.log('Old reservations deleted successfully');
}

// Run the function initially when the server starts
// May want to remove when deploying
deleteOldReservations();

// Schedule the function to run once every 2 days (every 48 hours)
setInterval(deleteOldReservations, 24 * 60 * 60 * 1000); // 24 hours * 60 minutes * 60 seconds * 1000 milliseconds

// Function to filter reservations based on room and date range
function filterReservations(room, startTime, endTime) {
  let reservations = [];
  if (fs.existsSync(reservationsFilePath)) {
    reservations = require(reservationsFilePath);
    //console.log('Reservations:\n',reservations) WORKS
  }
  //console.log('room',room,'startTime',startTime,'endtime',endTime) WORKS
  return(reservations.filter(reservation => {
      // Convert reservation date and time to a Date object
      const reservationDateTime = new Date(`${reservation.date}T${reservation.time}`);

      // Check if the reservation's room matches the specified room
      // and if the reservation falls within the specified date range
      return parseInt(reservation.room,10) === parseInt(room,10) &&
             reservationDateTime >= startTime &&
             reservationDateTime <= endTime;
  }));
}

app.get('/reservations', (req, res) => {
  const { room, startTime, endTime } = req.query;
  //console.log(room,startTime,endTime)
  const filteredReservations = filterReservations(room, new Date(startTime), new Date(endTime));

  const sanitizedReservations = filteredReservations.map(reservation => {
    const { email, password, ...sanitized } = reservation;
    return sanitized;
  });

  res.json(sanitizedReservations);
  //console.log(filteredReservations)
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
/*


*/