/**
 * TeleNUS Spam Filter
 *
 * Deletes messages that contains exactly these terms in its message body.
 *
 * "finance, statistics, nursing" - to match annoying homework box message
 * "paid trusted tutors" - same as above
 * "lifewebir" - some Arabic spam
 */

const matchingPattern = [
  "finance, statistics, nursing",
  "paid trusted tutors",
  "lifewebir",
  "Bellcurvehero",
  "Techbumps",
  "help you to search groups and channels",
];

module.exports = matchingPattern;
