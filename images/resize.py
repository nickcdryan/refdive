from PIL import Image

# Load original image
img = Image.open('icon512.png')

# Create resized versions
img16 = img.resize((16, 16), Image.Resampling.LANCZOS)
img48 = img.resize((48, 48), Image.Resampling.LANCZOS)
img128 = img.resize((128, 128), Image.Resampling.LANCZOS)

# Save resized versions
img16.save('icon16.png')
img48.save('icon48.png')
img128.save('icon128.png')
