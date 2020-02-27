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
import smtplib, ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


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
    phone = db.Column(db.String(20))
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
    smtp_host = db.Column(db.String(100), nullable=False)
    smtp_port = db.Column(db.Integer, nullable=False)
    smtp_login = db.Column(db.String(100), nullable=False)
    smtp_pass = db.Column(db.String(100), nullable=False)
    notification_email = db.Column(db.String(100), nullable=False)
    test_notification_email = db.Column(db.String(100), nullable=False)
    contact_email = db.Column(db.String(100), nullable=False)
    test_contact_email = db.Column(db.String(100), nullable=False)
    organization_name = db.Column(db.String(100), nullable=False)
    organization_url = db.Column(db.String(100), nullable=False)

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    registration_id = db.Column(db.String(36), db.ForeignKey('registration.id'), nullable=False)


@app.route('/')
def hello_world():
    return render_template('hello.html',uri=app.config['BASE_URI'],date=datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),config=os.environ.get('ASSEMBLE_SETTINGS_FILE',''),inst=os.environ.get('ASSEMBLE_INSTANCE_PATH',''))

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
        msg = None
        if exc_value is None:
            msg = "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue())
        else:
            msg = "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue())
        app.logger.error(msg)
        return  msg, 500
    return '', 201

@app.route('/events/<int:event_id>')
def get_event(event_id):
    evt = None
    prices = None
    try:
        evt = Event.query.filter_by(id=event_id).first()
        prices = EventPrice.query.filter(EventPrice.event_id).all()
    except:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        f = io.StringIO()
        traceback.print_tb(exc_traceback, file=f)
        msg = None
        if exc_value is None:
            msg = "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue())
        else:
            msg = "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue())
        app.logger.error(msg)
        return  msg, 500
    if evt is None:
        return '', 204

    retval = {
        'id': evt.id,
        'name':evt.name,
        'date':evt.date.strftime('%Y-%d-%m %H:%M'),
        'description':evt.description
    }

    retval['prices'] = [ {'price':price.price, 'participant_type':price.participant_type, 'event_id':price.event_id} for price in prices ]

    return json.dumps(retval), 200, {'Content-Type': 'application/json'}

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
        msg = None
        if exc_value is None:
            msg = "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue())
        else:
            msg = "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue())
        app.logger.error(msg)
        return  msg, 500
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
        msg = None
        if exc_value is None:
            msg = "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue())
        else:
            msg = "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue())
        app.logger.error(msg)
        return  msg, 500
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
        participant.phone = json.get('phone', None)
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
        msg = None
        if exc_value is None:
            msg = "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue()), 500
        else:
            msg = "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue())
        app.logger.error(msg)
        return  msg, 500

    return jsonify(
            id=participant.id,
            first_name=participant.first_name, 
            last_name=participant.last_name, 
            email=participant.email, 
            phone=participant.phone, 
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
        msg = None
        if exc_value is None:
            msg = "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue())
        else:
            msg = "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue())
        app.logger.error(msg)
        return  msg, 500

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
                'phone':participant.phone,
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
        msg = None
        if exc_value is None:
            msg = "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue()), 500
        else:
            msg = "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue())
        app.logger.error(msg)
        return  msg, 500
    return jsonify(id=registration.id, event_id=registration.event_id), 201

@app.route('/events/<int:event_id>/registrations/<string:registration_id>')
def get_registration(event_id, registration_id):
    registration = None
    participants = None

    try:
        registration = Registration.query.filter(Registration.id == registration_id).first()
        participants = Participant.query.filter(Participant.event_id == event_id and Participant.registration_id == registration_id).all()
    except:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        f = io.StringIO()
        traceback.print_tb(exc_traceback, file=f)
        msg = None
        if exc_value is None:
            msg = "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue()), 500
        else:
            msg = "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue())
        app.logger.error(msg)
        return  msg, 500

    retval = {
        'id':registration.id,
        'event_id':registration.event_id,
        'completed':registration.completed
    }

    retval['participants'] = [ {'id':participant.id,
                'first_name':participant.first_name, 
                'last_name':participant.last_name,
                'email':participant.email,
                'phone':participant.phone,
                'age':participant.age,
                'den':participant.den,
                'participant_type':participant.participant_type,
                'allergies':participant.allergies,
                'dietary_restrictions':participant.dietary_restrictions, 
                'event_id':participant.event_id} for participant in participants ]

    return json.dumps(retval), 200, {'Content-Type': 'application/json'}

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
                'phone':participant.phone,
                'age':participant.age,
                'den':participant.den,
                'participant_type':participant.participant_type,
                'allergies':participant.allergies,
                'dietary_restrictions':participant.dietary_restrictions, 
                'event_id':participant.event_id} for participant in participants ]

    return json.dumps(retval), 200, {'Content-Type': 'application/json'}


def send_participant_emails(settings, event_id, registration_id, order_items, total, test=False):
    evt = Event.query.filter_by(id=event_id).first()
    participants = Participant.query.filter(Participant.event_id == event_id and Participant.registration_id == registration_id).all()

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context) as server:
        server.login(settings.smtp_login, settings.smtp_pass)

        for participant in participants:
            if participant.email != None and participant.email != '':
                app.logger.info("Sending email to {email}".format(email=participant.email))
                message = MIMEMultipart("alternative")
                message["Subject"] = "{event_name} registration confirmation".format(event_name=evt.name)
                message["From"] = settings.smtp_login
                message["To"] = participant.email

                html = render_template('participant-email.html', 
                    participant=participant,
                    participants=participants,
                    event=evt,
                    order_items=order_items,
                    contact_email=settings.test_contact_email if test else settings.contact_email,
                    organization_name=settings.organization_name,
                    organization_url=settings.organization_url
                )

                text = render_template('participant-email.txt', 
                    participant=participant,
                    participants=participants,
                    event=evt,
                    order_items=order_items,
                    contact_email=settings.test_contact_email if test else settings.contact_email,
                    organization_name=settings.organization_name,
                    organization_url=settings.organization_url
                )

                part1 = MIMEText(text, "plain")
                part2 = MIMEText(html, "html")

                message.attach(part1)
                message.attach(part2)

                server.sendmail(settings.smtp_login, participant.email, message.as_string())

# IPN example https://github.com/paypal/ipn-code-samples/blob/master/python/paypal_ipn.py
# https://developer.paypal.com/docs/ipn/integration-guide/IPNandPDTVariables/
@app.route('/events/<int:event_id>/registrations/<string:registration_id>/ipn', methods=['POST'])
def handle_ipn(event_id, registration_id):
    app.logger.info("Processing registration {registration_id} for event {event_id}".format(registration_id=registration_id, event_id=event_id))
    settings = None
    test = False
    order_items = []
    total = 0.00

    try:
        raw_data = request.get_data()

        settings = Settings.query.get(1)

        if settings is None:
            return '', 500

        check = Registration.query.filter(Registration.id == registration_id).first()

        if check is None:
            return '', 400

        if check.completed:
            # We've already gotten the IPN message. Just send the confirmation again.
            return '', 200

        # Optimistically mark as completed
        check.completed = True
        db.session.commit()

        raw = None

        charset = request.form.get('charset')

        app.logger.info("Charset: {charset}".format(charset=charset))

        if charset == 'windows-1252':
            raw = raw_data.decode('cp1252')
        else:
            raw = raw_data.decode('utf-8')

        app.logger.info('Data: %s', raw)
        # dict of lists
        form_data = urllib.parse.parse_qs(raw)
        for key in form_data.keys():
            temp_list = form_data.get(key)
            if key == 'custom' and len(temp_list) > 0:
                temp = urllib.parse.unquote(temp_list[0])
                app.logger.info("custom field json: {json}".format(json=temp))
                custom = json.loads(temp)
                test = custom.get('test', False)

            if key.startswith('item_name'):
                num = key[9:]
                app.logger.info("Processing item {num}".format(num=num))
                item = OrderItem()
                if len(temp_list) > 0:
                    item.name = temp_list[0]

                temp_list = form_data.get('mc_gross_' + num)
                if len(temp_list) > 0:
                    item.amount = float(temp_list[0])

                temp_list = form_data.get('quantity' + num)
                if len(temp_list) > 0:
                    item.quantity = int(temp_list[0])
                
                item.event_id = event_id
                item.registration_id = registration_id
                order_items.append(item)
                total = total + item.amount * item.quantity

            for val in temp_list:
                app.logger.info('%s: %s', key, val)

        f = io.BytesIO()

        if charset == 'windows-1252':
            f.write('cmd=_notify-validate&'.encode('cp1252'))
            f.write(raw.encode('cp1252'))
        else:
            f.write('cmd=_notify-validate&'.encode('utf-8'))
            f.write(raw.encode('utf-8'))
        
        f.seek(0)
        

        response = None

        if test:
            response = requests.post(settings.test_verification_url, data=f)
        else:
            response = requests.post(settings.verification_url, data=f)

        app.logger.info("IPN verification url response: {response}".format(response=response.text))

        if response.text == 'VERIFIED':
            for item in order_items:
                db.session.add(item)
            db.session.commit()

            send_participant_emails(settings, event_id, registration_id, order_items, total, test=test)

        elif response.text == 'INVALID':
            registration = Registration.query.filter(Registration.id == registration_id).first()
            registration.completed = False
            db.session.commit()
            return '', 400

    except:
        msg = None
        exc_type, exc_value, exc_traceback = sys.exc_info()
        f = io.StringIO()
        traceback.print_tb(exc_traceback, file=f)
        msg = None
        if exc_value is None:
            msg = "Unexpected error: {err}\nTraceback: {tb}".format(err=exc_type,tb=f.getvalue())
        else: 
            msg = "Unexpected error: {err}\nMessage: {msg}\nTraceback: {tb}".format(err=exc_type,msg=exc_value,tb=f.getvalue())
        app.logger.error(msg)
        return msg, 500


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
