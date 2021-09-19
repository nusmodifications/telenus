/**
 * TeleNUS Spam Filter
 * 
 * Deletes messages that contains exactly these terms in its message body.
 * 
 * "finance, statistics, nursing" - to match annoying homework box message
 */

const matchingPattern = ["finance, statistics, nursing"];

module.exports = matchingPattern;
