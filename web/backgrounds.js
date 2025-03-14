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
  ...MARBLE_IMAGES,
  
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:3180/full/730,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:528/full/472,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:515/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:508/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:506/full/443,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:504/full/456,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:503/full/444,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:500/full/431,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:2310/full/730,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:2290/full/557,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:1174/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:1172/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:1167/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:1111/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:1109/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:1092/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:1090/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:1084/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:1078/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:1056/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:1036/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:747/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:785/full/582,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:661/full/524,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:656/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:380/full/415,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:378/full/400,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:978/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:963/full/485,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:962/full/590,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:308/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:306/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:303/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:300/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:298/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:297/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:292/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:290/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:289/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:282/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:277/full/600,/0/default.jpg",
"https://libmma.contentdm.oclc.org/iiif/2/p16028coll21:276/full/600,/0/default.jpg",
  // Add more URLs here, each one in quotes and separated by commas
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