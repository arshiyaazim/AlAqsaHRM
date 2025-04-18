import os
import cairosvg

# Sizes for PWA icons
sizes = [72, 96, 128, 144, 152, 192, 384, 512]

# Input and output paths
svg_path = "static/icons/icon.svg"
output_dir = "static/icons"

# Make sure the output directory exists
os.makedirs(output_dir, exist_ok=True)

# Convert SVG to PNG for each size
for size in sizes:
    output_path = f"{output_dir}/icon-{size}x{size}.png"
    cairosvg.svg2png(
        url=svg_path,
        write_to=output_path,
        output_width=size,
        output_height=size
    )
    print(f"Created {output_path}")

print("Icon conversion complete!")