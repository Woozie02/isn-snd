import sys
import os

# Ensure bundled pylib directory is in sys.path
base_dir = os.path.dirname(os.path.abspath(__file__))
pylib_dir = os.path.join(base_dir, 'pylib')
if os.path.exists(pylib_dir) and pylib_dir not in sys.path:
    sys.path.insert(0, pylib_dir)

import io
import pypdf
from reportlab.pdfgen import canvas

def generate_participant_certificate(attendee_name, reg_id='', institution='', team_name='', output_pdf_path=''):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    template_path = os.path.join(base_dir, 'snd26-cert-template-signed.pdf')
    
    if not os.path.exists(template_path):
        template_path = os.path.join(base_dir, 'assets', 'cert_base_template.pdf')
        
    base_reader = pypdf.PdfReader(template_path)
    base_page = base_reader.pages[0]
    
    # Official signed template dimensions: 595.5 x 850.08 pt (Portrait A4)
    page_w = 595.5
    page_h = 850.08
    center_x = page_w / 2.0  # 297.75 pt
    
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(page_w, page_h))
    
    # Recipient Full Name Only (centered in the certificate name gap)
    name_str = attendee_name.strip().upper()
    font_size = 23 if len(name_str) < 28 else (19 if len(name_str) < 40 else 15)
    
    # Navy tone matching ISN certificate theme: rgb(17, 19, 63)
    can.setFillColorRGB(0.067, 0.075, 0.247)
    can.setFont('Helvetica-Bold', font_size)
    can.drawCentredString(center_x, 424, name_str)
    
    can.save()
    packet.seek(0)
    
    overlay_reader = pypdf.PdfReader(packet)
    writer = pypdf.PdfWriter()
    base_page.merge_page(overlay_reader.pages[0])
    writer.add_page(base_page)
    
    if output_pdf_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_pdf_path)), exist_ok=True)
        with open(output_pdf_path, 'wb') as f:
            writer.write(f)
        print(f'SUCCESS:{output_pdf_path}')
    else:
        print('ERROR: No output path provided')

if __name__ == '__main__':
    name = sys.argv[1] if len(sys.argv) > 1 else 'Nurliyana binti Abdul Razak'
    reg_id = sys.argv[2] if len(sys.argv) > 2 else 'ISN-26001'
    inst = sys.argv[3] if len(sys.argv) > 3 else 'UCSI University'
    team = sys.argv[4] if len(sys.argv) > 4 else 'Team Pink'
    out = sys.argv[5] if len(sys.argv) > 5 else (sys.argv[2] if len(sys.argv) > 2 and sys.argv[2].endswith('.pdf') else os.path.join(os.path.dirname(__file__), 'assets', 'certificates', 'test_sample_cert.pdf'))
    generate_participant_certificate(name, reg_id, inst, team, out)
