import os
import io
import time
import threading
import nightcore as nc
from flask import Flask, request, send_file, render_template
from werkzeug.utils import secure_filename

app = Flask(__name__)
# delete a file after a delay of 60 seconds
def delete_file_after_delay(filename, delay=60):
    """Delete a file after a delay."""
    time.sleep(delay)
    os.remove(filename)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/upload', methods=['POST'])
def upload():
    if 'audiofile' not in request.files:
        return "No file part"
    
    file = request.files['audiofile']
    if file.filename == '':
        return 'No selected file'

    # read the file into memory
    file_stream = io.BytesIO(file.read())
    filename = secure_filename(file.filename)

    # process the file with nightcore
    nc_audio = nc.Tones(1)
    nc_audio = file_stream @ nc_audio

    # export the nightcore version
    nc_filename = '[Nightcore] ' + filename
    nc_audio.export(nc_filename, format="mp3")

    # schedule the file for deletion
    threading.Thread(target=delete_file_after_delay, args=(nc_filename,)).start()

    # send the file back to the user
    return send_file(
        nc_filename,
        as_attachment=True,
        download_name='nightcore_' + filename,
        mimetype='audio/mp3'
    )

if __name__ == '__main__':
    app.run(debug=True)