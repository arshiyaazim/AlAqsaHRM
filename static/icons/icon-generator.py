# Icon Generator for Al-Aqsa Security PWA
# This script generates PNG icons of different sizes from a text-based description

import cairo
import math
import os

# Function to generate a shield icon with a check mark
def generate_shield_icon(size, filename, background_color=(78/255, 115/255, 223/255), 
                        foreground_color=(255/255, 255/255, 255/255)):
    """Generate a shield icon with a check mark"""
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, size, size)
    ctx = cairo.Context(surface)
    
    # Scale to normalize coordinates to 1x1
    ctx.scale(size, size)
    
    # Background circle with slight transparency
    ctx.arc(0.5, 0.5, 0.485, 0, 2 * math.pi)
    ctx.set_source_rgba(*background_color, 1.0)
    ctx.fill()

    # Draw shield
    shield_width = 0.55
    shield_height = 0.65
    
    # Adjust for aspect ratio
    x = 0.5 - shield_width / 2
    y = 0.5 - shield_height / 2
    
    # Draw rounded shield shape
    radius = 0.07
    
    # Top left corner
    ctx.arc(x + radius, y + radius, radius, math.pi, 1.5 * math.pi)
    
    # Top right corner
    ctx.arc(x + shield_width - radius, y + radius, radius, 1.5 * math.pi, 0)
    
    # Bottom pointy part
    ctx.line_to(x + shield_width, y + shield_height - 0.15)
    ctx.line_to(x + shield_width / 2, y + shield_height)
    ctx.line_to(x, y + shield_height - 0.15)
    
    # Back to top left
    ctx.line_to(x, y + radius)
    
    ctx.close_path()
    
    # Set shield fill color
    ctx.set_source_rgba(*foreground_color, 1.0)
    ctx.fill_preserve()
    
    # Add a slight border
    ctx.set_source_rgba(*background_color, 0.7)
    ctx.set_line_width(0.01)
    ctx.stroke()
    
    # Draw checkmark inside shield
    check_size = shield_width * 0.6
    check_x = 0.5 - check_size / 2.8
    check_y = 0.5
    
    # Set checkmark settings
    ctx.set_line_width(0.06)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    
    # Draw checkmark
    ctx.move_to(check_x, check_y)
    ctx.line_to(check_x + check_size / 3, check_y + check_size / 3)
    ctx.line_to(check_x + check_size, check_y - check_size / 2)
    
    # Set checkmark color
    ctx.set_source_rgba(*background_color, 1.0)
    ctx.stroke()
    
    # Save PNG
    surface.write_to_png(filename)
    print(f"Generated {filename}")

# Ensure directory exists
os.makedirs("static/icons", exist_ok=True)

# Generate different sizes
sizes = [16, 32, 48, 72, 96, 144, 192, 512]
for size in sizes:
    filename = f"icon-{size}x{size}.png"
    generate_shield_icon(size, filename)

# Generate maskable icons (with some padding)
for size in [192, 512]:
    filename = f"maskable-icon-{size}x{size}.png"
    # Generate with extra background space for maskable icons
    generate_shield_icon(size, filename, 
                      background_color=(78/255, 115/255, 223/255),
                      foreground_color=(255/255, 255/255, 255/255))

# Generate apple-touch-icon
generate_shield_icon(180, "apple-touch-icon.png")

# Generate special icons for clock in/out shortcuts
generate_shield_icon(96, "clockin.png", 
                 background_color=(28/255, 200/255, 138/255), 
                 foreground_color=(255/255, 255/255, 255/255))

generate_shield_icon(96, "clockout.png", 
                 background_color=(231/255, 74/255, 59/255), 
                 foreground_color=(255/255, 255/255, 255/255))

# Generate favicon
generate_shield_icon(32, "favicon.ico")

print("Icon generation complete!")