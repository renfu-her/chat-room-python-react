import uuid
import os
import io
from PIL import Image
from fastapi import UploadFile
from dotenv import load_dotenv

load_dotenv()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def process_image_upload(file: UploadFile) -> dict:
    """
    Process image upload: convert to webp with UUID filename
    Returns: {url, name, mimeType, size, isImage}
    """
    # Generate UUID filename
    file_uuid = str(uuid.uuid4())
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    # Check if it's an image
    is_image = file.content_type and file.content_type.startswith('image/')
    
    if is_image:
        # Read image
        image_data = await file.read()
        
        # Open with Pillow
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary (for formats like PNG with transparency)
        if image.mode in ('RGBA', 'LA', 'P'):
            rgb_image = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            rgb_image.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
            image = rgb_image
        
        # Save as webp
        webp_filename = f"{file_uuid}.webp"
        webp_path = os.path.join(UPLOAD_DIR, webp_filename)
        image.save(webp_path, 'WEBP', quality=85)
        
        file_size = os.path.getsize(webp_path)
        
        return {
            "url": f"/api/uploads/{webp_filename}",
            "name": file.filename or "image.webp",
            "mimeType": "image/webp",
            "size": file_size,
            "isImage": True
        }
    else:
        # For non-image files, save as-is with UUID
        file_uuid = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
        saved_filename = f"{file_uuid}{file_extension}"
        saved_path = os.path.join(UPLOAD_DIR, saved_filename)
        
        # Save file
        await file.seek(0)
        with open(saved_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        file_size = os.path.getsize(saved_path)
        
        return {
            "url": f"/api/uploads/{saved_filename}",
            "name": file.filename or "file",
            "mimeType": file.content_type or "application/octet-stream",
            "size": file_size,
            "isImage": False
        }
