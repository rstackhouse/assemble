import os
import io
import unittest
from unittest.mock import patch
import datetime
import urllib
import json

from app import app, db, Registration, Participant, Settings, EventPrice

TEST_DB = 'test.db'

class FakeRequestsResponse:
    def __init__(self, text=None):
        self.text = text

class EventTests(unittest.TestCase):

    def setUp(self):
        app.config['TESTING'] = True
        app.config['BASE_URI'] = 'http://localhost:5000'
        app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///{test_file}".format(test_file=TEST_DB)
        self.app = app.test_client()
        db.drop_all()
        db.create_all()

        settings = Settings()
        settings.business_id = 'someone@somewhere-org'
        settings.test_business_id = 'test.someone@somewhere-org'
        settings.submission_url = 'http://not-a-real-url'
        settings.test_submission_url = 'http://test-not-a-real-url'
        settings.verification_url = 'http://not-a-real-verification-url'
        settings.test_verification_url = 'http://test-not-a-real-verification-url'
        settings.smtp_host = 'somewhere-org'
        settings.smtp_port = 587
        settings.smtp_login = 'some.guy@somewhere-org'
        settings.smtp_pass = 'apassword'
        settings.notification_email = 'someone.who.cares@somewhere-org'
        settings.test_notification_email = 'test.someone.who.cares@somewhere-org'
        settings.contact_email = 'someone.who.cares@somewhere-org'
        settings.test_contact_email = 'test.someone.who.cares@somewhere-org'
        settings.organization_name = 'Somewhere'
        settings.organization_url = 'http://somewhere-org'
        settings.paypal_rate = 0.022
        settings.paypal_surcharge = 0.30

        db.session.add(settings)
        db.session.commit()



    def tearDown(self):
        pass


    def create_event(self, event_name, event_date, event_description):
        data = {
            'name': event_name,
            'date': event_date,
            'description': event_description
        }
        response = self.app.post('/events', json=data)
        return response

    def create_event_price(self, event_id, participant_type, price):
        data = {
            'event_id': event_id,
            'participant_type': participant_type,
            'price': price
        }
        response = self.app.post('/events/prices', json=data)
        return response

    def create_registration(self, event_id):
        response = self.app.post("/events/{event_id}/registrations/create".format(event_id=event_id))
        return response

    def create_participant(self, event_id, registration_id, first_name, last_name, participant_type, email=None, phone=None, age=None, den=None, allergies=None, dietary_restrictions=None):
        data = {
            'first_name': first_name,
            'last_name': last_name,
            'email': email,
            'phone': phone,
            'age': age,
            'den': den,
            'participant_type': participant_type,
            'allergies': allergies,
            'dietary_restrictions': dietary_restrictions,
            'event_id': event_id,
            'registration_id': registration_id
        }
        response = self.app.post(
            "/events/{event_id}/participants".format(event_id=event_id),
            json=data
        )
        return response

    def send_ipn(self, event_id, registration_id, participants):
        return self.do_send_ipn(
            event_id,
            registration_id,
            participants,
            "/events/{event_id}/registrations/{registration_id}/ipn".format(event_id=event_id,registration_id=registration_id)
        )

    def send_base_ipn(self, event_id, registration_id, participants):
        return self.do_send_ipn(
            event_id,
            registration_id,
            participants,
            '/ipn'
        )

    def do_send_ipn(self, event_id, registration_id, participants, post_url):
        settings = Settings.query.get(1)

        buf = io.StringIO() 

        buf.write('charset=utf-8')

        custom = { 'event_id': event_id, 'registration_id': registration_id, 'test': False }

        temp = json.dumps(custom)

        temp = urllib.parse.quote(temp)

        buf.write('&custom=')

        buf.write(temp)

        prices = EventPrice.query.filter(EventPrice.event_id == event_id).all()

        d = {}

        for participant in participants:
            l = d.get(participant.participant_type, [])
            l.append(participant)
            d[participant.participant_type] = l

        num = 1
        for key in d:
            l = d.get(key)
            buf.write("&item_name{num}={name}".format(num=num,name=l[0].participant_type))
        
            price = None

            for event_price in prices:
                if event_price.participant_type == l[0].participant_type:
                    price = event_price
                    break

            buf.write("&mc_gross_{num}={amt}".format(num=num,amt=(price.price * len(l))))

            buf.write("&quantity{num}={qty}".format(num=num,qty=len(l)))

            num = num + 1

        data_str = buf.getvalue()

        data = data_str.encode('utf-8')

        response = self.app.post(
            post_url,
            data=data
        )
        return response

    def test_should_render_main_page(self):
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)

    def test_should_create_event(self):
        response = self.create_event('an event', datetime.datetime.now().strftime('%Y-%d-%m %H:%M'), 'an event')
        self.assertEqual(response.status_code, 201)

    def test_should_create_event_price(self):
        self.create_event('an event', datetime.datetime.now().strftime('%Y-%d-%m %H:%M'), 'an event')
        response = self.create_event_price(1, 'Adult', 10.00)
        self.assertEqual(response.status_code, 201)

    def test_should_create_registration(self):
        self.create_event('an event', datetime.datetime.now().strftime('%Y-%d-%m %H:%M'), 'an event')
        response = self.create_registration(1)
        self.assertEqual(response.status_code, 201)

    def test_should_create_participant(self):
        self.create_event('an event', datetime.datetime.now().strftime('%Y-%d-%m %H:%M'), 'an event')
        self.create_registration(1)
        registration = Registration.query.filter(Registration.event_id == 1).first()
        response = self.create_participant(1, registration.id, 'John', 'Smith', 'Adult')
        self.assertEqual(response.status_code, 201)

    @patch('app.smtplib')
    @patch('app.ssl')
    @patch('app.requests')
    def test_should_complete_registration(self, mock_requests, mock_ssl, mock_smtplib):
        self.create_event('an event', datetime.datetime.now().strftime('%Y-%d-%m %H:%M'), 'an event')
        self.create_event_price(1, 'Adult', 10.00)
        self.create_event_price(1, 'Scout', 10.00)
        self.create_event_price(1, 'Sibling', 10.00)
        self.create_registration(1)
        registration_id = Registration.query.filter(Registration.event_id == 1).first().id 
        self.create_participant(1, registration_id, 'John', 'Smith', 'Adult')
        self.create_participant(1, registration_id, 'Jimbo', 'Smith', 'Scout')
        self.create_participant(1, registration_id, 'James', 'Smith', 'Sibling')
        participants = Participant.query.filter(Participant.registration_id == registration_id).all()
        mock_requests.post.return_value = FakeRequestsResponse(text='VERIFIED')
        self.send_ipn(1, registration_id, participants)
        registration = Registration.query.filter(Registration.id == registration_id).first()
        self.assertTrue(registration.completed)

    @patch('app.smtplib')
    @patch('app.ssl')
    @patch('app.requests')
    def test_should_not_complete_registration(self, mock_requests, mock_ssl, mock_smtplib):
        self.create_event('an event', datetime.datetime.now().strftime('%Y-%d-%m %H:%M'), 'an event')
        self.create_event_price(1, 'Adult', 10.00)
        self.create_event_price(1, 'Scout', 10.00)
        self.create_event_price(1, 'Sibling', 10.00)
        self.create_registration(1)
        registration_id = Registration.query.filter(Registration.event_id == 1).first().id 
        self.create_participant(1, registration_id, 'John', 'Smith', 'Adult')
        self.create_participant(1, registration_id, 'Jimbo', 'Smith', 'Scout')
        self.create_participant(1, registration_id, 'James', 'Smith', 'Sibling')
        participants = Participant.query.filter(Participant.registration_id == registration_id).all()
        mock_requests.post.return_value = FakeRequestsResponse(text='INVALID')
        self.send_ipn(1, registration_id, participants)
        registration = Registration.query.filter(Registration.id == registration_id).first()
        self.assertFalse(registration.completed)

    @patch('app.smtplib')
    @patch('app.ssl')
    @patch('app.requests')
    def test_should_complete_registration_using_base_ipn_handler(self, mock_requests, mock_ssl, mock_smtplib):
        self.create_event('an event', datetime.datetime.now().strftime('%Y-%d-%m %H:%M'), 'an event')
        self.create_event_price(1, 'Adult', 10.00)
        self.create_event_price(1, 'Scout', 10.00)
        self.create_event_price(1, 'Sibling', 10.00)
        self.create_registration(1)
        registration_id = Registration.query.filter(Registration.event_id == 1).first().id 
        self.create_participant(1, registration_id, 'John', 'Smith', 'Adult')
        self.create_participant(1, registration_id, 'Jimbo', 'Smith', 'Scout')
        self.create_participant(1, registration_id, 'James', 'Smith', 'Sibling')
        participants = Participant.query.filter(Participant.registration_id == registration_id).all()
        mock_requests.post.return_value = FakeRequestsResponse(text='VERIFIED')
        self.send_base_ipn(1, registration_id, participants)
        registration = Registration.query.filter(Registration.id == registration_id).first()
        self.assertTrue(registration.completed)


if __name__ == '__main__':
    unittest.main()