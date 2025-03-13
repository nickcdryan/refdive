// backgrounds.js
// Collection of background images for the PDF viewer

// Marble texture IDs from Washington University collection
const MARBLE_IDS = [242, 413, 156, 83, 128, 95, 224, 218, 441, 59, 413, 533, 232, 185, 434, 41, 431, 459, 428, 178, 418, 54, 181, 347, 95, 362, 60, 125, 89, 87, 352, 318, 82, 310, 198, 144, 109, 114, 117, 14, 126, 110, 357, 79, 86, 127, 15];

// Create marble texture URLs from IDs
const MARBLE_BASE_URL = "https://digitalcollections.lib.washington.edu/digital/api/singleitem/image/dp/";
const MARBLE_IMAGES = MARBLE_IDS.map(id => `${MARBLE_BASE_URL}${id}/default.jpg`);

// Array of all background image URLs
const BACKGROUND_IMAGES = [
  // Marble backgrounds - added from IDs
  ...MARBLE_IMAGES
];

// Function to get a random background image URL
function getRandomBackgroundImage() {
  const randomIndex = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
  return BACKGROUND_IMAGES[randomIndex];
}

// Function to get a specific background image URL by index
function getBackgroundImage(index) {
  if (index >= 0 && index < BACKGROUND_IMAGES.length) {
    return BACKGROUND_IMAGES[index];
  }
  // Default to first image if index is invalid
  return BACKGROUND_IMAGES[0];
} 