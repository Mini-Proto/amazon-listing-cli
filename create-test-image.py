#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont

# Create a 1000x1000 white image
img = Image.new('RGB', (1000, 1000), color='white')
draw = ImageDraw.Draw(img)

# Try to use a basic font
try:
    # Try different font sizes
    font_large = ImageFont.load_default()
    font_medium = ImageFont.load_default()
except:
    font_large = None
    font_medium = None

# Draw text
draw.text((500, 400), "TEST LISTING", fill='red', anchor='mm')
draw.text((500, 500), "Wire Harness", fill='black', anchor='mm')
draw.text((500, 600), "DELETE ME", fill='red', anchor='mm')

# Draw a simple wire representation
draw.rectangle([200, 700, 800, 750], fill='black')
draw.rectangle([150, 680, 250, 770], fill='gray')
draw.rectangle([750, 680, 850, 770], fill='gray')

# Save the image
img.save('test-images/test-wire-harness.jpg', 'JPEG', quality=95)
print("Test image created: test-images/test-wire-harness.jpg")