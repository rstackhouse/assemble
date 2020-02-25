from flask import Flask, render_template, send_from_directory
from flask import request
from flask import jsonify
from flask_sqlalchemy import SQLAlchemy
import datetime
import os
import sys
import traceback
import io
import json
import uuid
import logging
import requests
import urllib.parse

app = Flask(__name__, static_folder='static', static_url_path='')

db = SQLAlchemy(app)

logging.basicConfig(filename='assemble.log', level=logging.DEBUG)

app.config.from_envvar('ASSEMBLE_SETTINGS_FILE')

app.config['TEMPLATES_AUTO_RELOAD'] = True

class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    description = db.Column(db.Text, nullable=False)

    def __repr__(self):
        return '<Event %r>' % self.name

class EventPrice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    price = db.Column(db.Float, nullable=False)
    participant_type = db.Column(db.String(25), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)

class Registration(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    completed = db.Column(db.Boolean)

class Participant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(40), nullable=False)
    last_name = db.Column(db.String(40), nullable=False)
    email = db.Column(db.String(100))
    age = db.Column(db.Integer)
    den = db.Column(db.String(10))
    participant_type = db.Column(db.String(25), nullable=False)
    allergies = db.Column(db.Text)
    dietary_restrictions = db.Column(db.Text)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    registration_id = db.Column(db.String(36), db.ForeignKey('registration.id'), nullable=False)

class Settings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.String(100), nullable=False)
    test_business_id = db.Column(db.String(100), nullable=False)
    submission_url = db.Column(db.String(100), nullable=False)
    test_submission_url = db.Column(db.String(100), nullable=False)
    verification_url= db.Column(db.String(100), nullable=False)
    test_verification_url= db.Column(db.String(100), nullable=False)

@app.route('/')
def hello_world():
    return render_template('hello.html',uri=app.config['BASE_URI'],date=datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),config=os.environ.get('ASSEMBLE_SETTINGS_FILE','duck'),inst=os.environ.get('ASSEMBLE_INSTANCE_PATH','goose'))

@app.route('/view/<string:view_name>')
def view(view_name):
    return send_from_directory(app.static_folder, view_name)

@app.route('/view/js/<string:view_name>')
def js(view_name):
    return send_from_directory(app.static_folder + '/js', view_name)

@app.route('/view/css/<string:view_name>')
def css(view_name):
    return send_from_directory(app.static_folder + '/css', view_name)


@app.route('/events', methods=['POST'])
def post_event():
    try:
        json = request.get_json()
        event = Event()
        event.name = json['name']
        event.date = datetime.datetime.strptime(json['date'], '%Y-%d-%m %H:%M')
        event.description = json['description']
        db.session.add(event)
        db.session.commit()
    except:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        f = io.StringIO()
        traceback.print_tb(exc_traceback, file=f)
        if exc_value is None:
            return "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue()), 500
        return "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue()), 500
    return '', 201

@app.route('/events/<int:event_id>')
def get_event(event_id):
    evt = None
    try:
        evt = Event.query.filter_by(id=event_id).first()
    except:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        f = io.StringIO()
        traceback.print_tb(exc_traceback, file=f)
        if exc_value is None:
            return "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue()), 500
        return "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue()), 500
    if evt is None:
        return '', 204
    return jsonify(id=evt.id,name=evt.name,date=evt.date,description=evt.description), 200

@app.route('/events/prices', methods=['POST'])
def post_event_price():
    try:
        json = request.get_json()
        price = EventPrice()
        price.price = json['price']
        price.participant_type = json['participant_type']
        price.event_id = json['event_id']
        db.session.add(price)
        db.session.commit()
    except:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        f = io.StringIO()
        traceback.print_tb(exc_traceback, file=f)
        if exc_value is None:
            return "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue()), 500
        return "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue()), 500
    return '', 201

@app.route('/events/<int:event_id>/prices')
def get_event_prices(event_id):
    prices = None
    try:
        prices = EventPrice.query.filter(EventPrice.event_id).all()
    except:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        f = io.StringIO()
        traceback.print_tb(exc_traceback, file=f)
        if exc_value is None:
            return "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue()), 500
        return "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue()), 500
    if prices is None:
        return '', 204

    retval = [ {'price':price.price, 'participant_type':price.participant_type, 'event_id':price.event_id} for price in prices ]

    return json.dumps(retval), 200, {'Content-Type': 'application/json'}

@app.route('/events/<int:event_id>/participants', methods=['POST'])
def post_event_participant(event_id):
    participant = None
    create = False
    try:
        json = request.get_json()

        if json.get('id', None) != None:
            participant = Participant.query.filter(Participant.id == json['id']).first()

        if participant == None:
            participant = Participant()
            create = True

        participant.first_name = json['first_name']
        participant.last_name = json['last_name']
        participant.email = json.get('email', None)
        participant.age = json.get('age', None)
        participant.den = json.get('den', None)
        participant.participant_type = json['participant_type']
        participant.allergies = json['allergies']
        participant.dietary_restrictions = json['dietary_restrictions']
        participant.event_id = json['event_id']
        participant.registration_id = json['registration_id']
        
        if create:
            db.session.add(participant)
        
        db.session.commit()

    except:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        f = io.StringIO()
        traceback.print_tb(exc_traceback, file=f)
        if exc_value is None:
            return "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue()), 500
        return "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue()), 500
    

    return jsonify(
            id=participant.id,
            first_name=participant.first_name, 
            last_name=participant.last_name, 
            email=participant.email, 
            age=participant.age, 
            den=participant.den, 
            participant_type=participant.participant_type,
            allergies=participant.allergies,
            dietary_restrictions=participant.dietary_restrictions,
            event_id=participant.event_id,
            registration_id=participant.registration_id), 201

@app.route('/events/<int:event_id>/participants/<int:participant_id>', methods=['DELETE'])
def delete_event_participant(event_id, participant_id):
    participant = None
    participant_type = None

    try:
        participant = Participant.query.filter(Participant.id == participant_id).first()
        participant_type = participant.participant_type
        db.session.delete(participant)
        db.session.commit()

    except:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        f = io.StringIO()
        traceback.print_tb(exc_traceback, file=f)
        if exc_value is None:
            return "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue()), 500
        return "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue()), 500

    return jsonify(id=participant_id,
        participant_type=participant_type), 200
    


@app.route('/events/<int:event_id>/participants')
def get_event_participants(event_id):
    participants = None
    try:
        participants = Participant.query.filter(Participant.event_id == event_id).all()
    except:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        f = io.StringIO()
        traceback.print_tb(exc_traceback, file=f)
        if exc_value is None:
            return "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue()), 500
        return "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue()), 500
    if participants is None:
        return '', 204

    retval = [ {'id':participant.id,
                'first_name':participant.first_name, 
                'last_name':participant.last_name,
                'email':participant.email,
                'age':participant.age,
                'den':participant.den,
                'participant_type':participant.participant_type,
                'allergies':participant.allergies,
                'dietary_restrictions':participant.dietary_restrictions, 
                'event_id':participant.event_id} for participant in participants ]

    return json.dumps(retval), 200, {'Content-Type': 'application/json'}

@app.route('/events/<int:event_id>/registrations/create', methods=['POST'])
def create_registration(event_id):
    registration = None
    try:
        registration = Registration()
        registration.id = str(uuid.uuid4())
        registration.event_id = event_id
        db.session.add(registration)
        db.session.commit()
    except:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        f = io.StringIO()
        traceback.print_tb(exc_traceback, file=f)
        if exc_value is None:
            return "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue()), 500
        return "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue()), 500
    return jsonify(id=registration.id, event_id=registration.event_id), 201

@app.route('/events/<int:event_id>/registrations')
def get_event_registrations(event_id):
    prices = None
    try:
        registrations = Registration.query.filter(Registration.event_id == event_id).all()
    except:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        f = io.StringIO()
        traceback.print_tb(exc_traceback, file=f)
        if exc_value is None:
            return "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue()), 500
        return "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue()), 500
    if prices is None:
        return '', 204

    retval = [ {'id':registration.id, 'event_id':registration.event_id, 'completed':registration.completed} for registration in registrations ]

    return json.dumps(retval), 200, {'Content-Type': 'application/json'}

@app.route('/events/<int:event_id>/registrations/<string:registration_id>/participants')
def get_event_registration_participants(event_id, registration_id):
    participants = None
    try:
        participants = Participant.query.filter(Participant.event_id == event_id and Participant.registration_id == registration_id).all()
    except:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        f = io.StringIO()
        traceback.print_tb(exc_traceback, file=f)
        if exc_value is None:
            return "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue()), 500
        return "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue()), 500
    if participants is None:
        return '', 204

    retval = [ {'id':participant.id,
                'first_name':participant.first_name, 
                'last_name':participant.last_name,
                'email':participant.email,
                'age':participant.age,
                'den':participant.den,
                'participant_type':participant.participant_type,
                'allergies':participant.allergies,
                'dietary_restrictions':participant.dietary_restrictions, 
                'event_id':participant.event_id} for participant in participants ]

    return json.dumps(retval), 200, {'Content-Type': 'application/json'}

# IPN example https://github.com/paypal/ipn-code-samples/blob/master/python/paypal_ipn.py

@app.route('/events/<int:event_id>/registrations/<string:registration_id>/ipn', methods=['POST'])
def handle_ipn(event_id, registration_id):
    settings = None
    test = False

    try:
        raw = request.get_data().decode('utf-8')
        app.logger.info('Data: %s', raw)
        for key in request.form.keys():
            if key == 'custom':
                custom = json.loads(urllib.parse.unquote(request.form.get(key)))
                test = custom.get('test', False)

            app.logger.info('%s: %s', key, str(request.form.get(key)))

        settings = Settings.query.get(1)

        if settings is None:
            return '', 400
    
        request_body = urllib.parse.parse_qsl('cmd=_notify-validate&' + raw)

        response = None

        if test:
            response = requests.post(settings.test_verification_url, data=request_body)
        else:
            response = requests.post(settings.verification_url, data=request_body)

        if response.text == 'VERIFIED':
            registration = Registration.query.filter(Registration.id == registration_id).first()
            registration.completed = True
            db.session.commit()

        elif response.text == 'INVALID':
            return '', 400

    except:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        f = io.StringIO()
        traceback.print_tb(exc_traceback, file=f)
        if exc_value is None:
            return "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue()), 500
        return "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue()), 500


    return '', 200

@app.route('/settings')
def get_settings():
    settings = None
    test = request.args.get('test', False)
    try:
        settings = Settings.query.get(1)
    except:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        f = io.StringIO()
        traceback.print_tb(exc_traceback, file=f)
        if exc_value is None:
            return "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue()), 500
        return "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue()), 500
    if settings is None:
        return '', 204

    if test:
        return jsonify(id=settings.id, business_id=settings.test_business_id, submission_url=settings.test_submission_url), 200
    else:
        return jsonify(id=settings.id, business_id=settings.business_id, submission_url=settings.submission_url), 200
