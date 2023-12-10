from PIL import Image
import numpy as np
import os
import glob
from pathlib import Path

class ImageEditor:

  def __init__(self, from_path: str) -> None:
    # Lets you use tilde ~ in your file path names
    new_from_path = os.path.expanduser(from_path)
    self.img = Image.open(new_from_path)

  # 
  og_color = (224, 17, 95)
  new_color = (37, 0, 255)
  # 
  def replace(self, og_color: tuple, new_color: tuple) -> Image.Image:
    img = self.img.convert('RGBA')
    data = np.array(img)
    # print(data)

    og_rgba = og_color + (255,)
    new_rgba = new_color + (255,)
    original_indices = (data == og_rgba).all(axis = -1)
    data[original_indices] = new_rgba

    img2 = Image.fromarray(data)
    
    return img2
  
if __name__ == '__main__':
    my_path = "./output/"
    # my_path = "./timesteps/Index of _output - 8_29_2023 12-42-19 PM/"
    images = ["./train_icons/LRT Kelana Jaya Line.png"]
    # print(images)

    timesteps = []
    for image in images:
    
        editor = ImageEditor(from_path=image)
        name = Path(image).name

        og_color = (224, 17, 95)
        new_color = (37, 0, 255)

        updated_img = editor.replace(og_color, new_color)
        # img2 = updated_img.crop((346, 192, 1788, 1424))
        updated_img.thumbnail((360, 308))
        # img2.save(f"./edits/{name}")
        print(name)
        updated_img.save(f"./lrt3.png") 
    # og_color = (13,13,13)
    # new_color = (18,133,72)

    # new_img = editor.replace(og_color, new_color)

    # new_img.save(f"./updated.png")
    # updated_img.show()