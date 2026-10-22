"""Public deployment URL and QR exports. No placeholder address is encoded."""
from io import BytesIO
from urllib.parse import urlsplit
import qrcode
import qrcode.image.svg

def public_url(env):
    value=(env.get('PUBLIC_APP_URL') or env.get('RENDER_EXTERNAL_URL') or '').strip()
    if not value:return None
    parts=urlsplit(value)
    if parts.scheme!='https' or not parts.hostname or parts.username or parts.password:
        raise ValueError('PUBLIC_APP_URL үшін жарамды HTTPS мекенжайы керек.')
    if parts.hostname in ['localhost','127.0.0.1','0.0.0.0']:
        raise ValueError('QR үшін жалпыға ашық мекенжай керек.')
    return value

def qr_bytes(url,fmt='png'):
    qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=16,border=4)
    qr.add_data(url);qr.make(fit=True);out=BytesIO()
    if fmt=='svg':
        qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(out)
    elif fmt=='png':
        qr.make_image(fill_color='black',back_color='white').save(out,format='PNG')
    else:raise ValueError('PNG немесе SVG таңдаңыз.')
    return out.getvalue()
