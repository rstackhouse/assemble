(function () {
	var script = document.currentScript;
	var scriptPath = script.src;
	var basePath = scriptPath.substr(0,script.src.indexOf('/view'));
	var eventId = script.getAttribute('data-event-id');
	var documentLoaded = false;
	var viewSrc = null;
	var viewLoading = false;
	var loading = [];
	var scouts = [];
	var adults = [];
	var siblings = [];
	var $ = null;
	var template = null;
	var eventTemplate = null;
	var checkoutTemplate = null;
	var event = null;
	var eventPrices = null;
	var fetchingParticipants = false;
	var registrationId = localStorage.getItem('registrationId');
	var scoutPrice = null;
	var siblingPrice = null;
	var adultPrice = null;
	var businessId = null;
	var notifyUrl = null;
	var iconUrl = null;
	var returnUrl = null;

	function addBootstrap(callback) {
		var head = document.getElementsByTagName('head')[0];
		if (typeof jQuery === "undefined" || jQuery === null) {
			var jq = document.createElement('script');
			jq.src="https://code.jquery.com/jquery-3.3.1.slim.min.js";
			jq.integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo";
			jq.crossOrigin="anonymous";
			jq.onload = callback;
			loading.push(jq);
			head.appendChild(jq);
		}

		if (typeof createPopper === "undefined" || createPopper === null) {
			var p = document.createElement('script');
			p.src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js"; 
			p.integrity="sha384-UO2eT0CpHqdSJQ6hJty5KVphtPhzWj9WO1clHTMGa3JDZwrnQq4sF86dIHNDz0W1"; 
			p.crossOrigin="anonymous";
			p.onload = callback;
			loading.push(p);
			head.appendChild(p);
		}

		if (document.querySelectorAll('script[src*=bootstrap]').length == 0) {
			var b = document.createElement('script');
			b.src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js";
			b.integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM";
			b.crossOrigin="anonymous";
			b.onload = callback;
			loading.push(b);
			head.appendChild(b);
		}

		if (document.querySelectorAll('link[href*=bootstrap]').length == 0) {
			var c = document.createElement('link');
			c.rel="stylesheet";
			c.href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css";
			c.integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T";
			c.crossOrigin="anonymous";
			c.onload = callback;
			loading.push(c);
			head.appendChild(c);
		}
	}

	function addMustache(callback) {
		if (document.querySelectorAll('script[src*=mustache]').length == 0) {
			var head = document.getElementsByTagName('head')[0];
			var m = document.createElement('script');
			m.crossOrigin="anonymous";
			m.src="https://cdnjs.cloudflare.com/ajax/libs/mustache.js/3.1.0/mustache.min.js";
			m.integrity="sha256-MPgtcamIpCPKRRm1ppJHkvtNBAuE71xcOM+MmQytXi8=";
			m.crossOrigin="anonymous";
			m.onload = callback;
			loading.push(m);
			head.appendChild(m);
		}
	}

	function resourcesLoaded() {
		return typeof jQuery !== "undefined" && typeof createPopper !== "undefined" && document.querySelectorAll('script[src*=bootstrap]').length !== 0 && document.querySelectorAll('link[href*=bootstrap]').length !== 0 && typeof Mustache !== "undefined";
	}

	if (resourcesLoaded()) {
		loadView();
	}
	else {
		addBootstrap(loadView);
		addMustache(loadView);
	}

	function createRegistration() {
		var xhr = new XMLHttpRequest();
		xhr.onload = function(e) {
			registration = JSON.parse(xhr.response);
			registrationId = registration.id;
			localStorage.setItem('registrationId', registrationId);
			populateData();
		};
		var url = basePath + '/events/' + eventId + '/registrations/create';
		xhr.open('POST',url);
		xhr.send();
	}

	if (registrationId) {
		if (window.console) {
			console.log('Resuming with registration: ' + registrationId);
		}
		getParticipants();
	}
	else {
		createRegistration();
	}

	function getParticipants() {
		fetchingParticipants = true;
		var xhr = new XMLHttpRequest();
		xhr.onload = function(e) {
			fetchingParticipants = false;
			participants = JSON.parse(xhr.response);

			for (var i = 0; i < participants.length; i++) {
				var p = participants[i];
				if (p.participant_type == 'scout') {
					scouts.push({
						firstName: p.first_name,
						lastName: p.last_name,
						age: p.age,
						den: p.den,
						allergies: p.allergies,
						dietaryRestrictions: p.dietary_restrictions
					});
				}
				else if (p.participant_type == 'sibling') {
					siblings.push({
						firstName: p.first_name,
						lastName: p.last_name,
						age: p.age,
						allergies: p.allergies,
						dietaryRestrictions: p.dietary_restrictions
					});
				}
				else if (p.participant_type == 'adult') {
					adults.push({
						firstName: p.first_name,
						lastName: p.last_name,
						email: p.email,
						allergies: p.allergies,
						dietaryRestrictions: p.dietary_restrictions
					});
				}
			}

			populateData();
			fillCart();
		};
		var url = basePath + '/events/' + eventId + '/participants';
		xhr.open('GET',url);
		xhr.send();
	}

	function getEvent() {
		var xhr = new XMLHttpRequest();
		xhr.onload = function(e) {
			event = JSON.parse(xhr.response);
			populateData();
		};
		var url = basePath + '/events/' + eventId;
		xhr.open('GET',url);
		xhr.send();
	}

	function getEventPrices() {
		var xhr = new XMLHttpRequest();
		xhr.onload = function(e) {
			prices = JSON.parse(xhr.response);
			eventPrices = [];
			for (var i = 0; i < prices.length; i++) {
				var p = prices[i];
				var price = {
					price: p.price,
					participantType: p.participant_type
				};
				eventPrices.push(price);
				if (price.participantType == 'scout') {
					scoutPrice = price.price;
				}
				else if (price.participantType == 'sibling') {
					siblingPrice = price.price;
				}
				else if (price.participantType == 'adult') {
					adultPrice = price.price;
				}
			}

			populateData();
		};
		var url = basePath + '/events/' + eventId + '/prices';
		xhr.open('GET',url);
		xhr.send();
	}

	function getData() {
		getEvent();
		getEventPrices();
	}

	getData();

	function canPopulateData() {
		return registrationId != null && !fetchingParticipants && viewSrc != null && event != null && eventPrices != null;
	}

	function populateData() {
		if (canPopulateData()) {
			render();
		}
	}

	function canLoadView() {
		return loading.length == 0;	
	}

	function markLoaded(e) {
		for (var i = 0; i < loading.length; i++) {
			if (e === loading[i]) {
				loading.splice(i, 1);	
				return;
			}
		}
	}

	function createFragment(htmlStr) {
		var frag = document.createDocumentFragment(), temp = document.createElement('div');
 		temp.innerHTML = htmlStr;
		while(temp.firstChild) {
			frag.appendChild(temp.firstChild);
		}
		return frag;
	}

	function addScout() {
		var form = $('#participantForm');	
		var scout = {
			firstName: $('#firstName').val(),
			lastName: $('#lastName').val(),
			age: $('#age').val(),
			den: $('#den').val(),
			allergies: $('#allergies').val(),
			dietaryRestrictions: $('#dietaryRestrictions').val(),
			isScout: true,
			isAdult: false
		};
		scouts.push(scout);
		saveParticipant(scout);
		fillCart();
	}
	
	function addAdult() {
		var form = $('#participantForm');	
		var adult = {
			firstName: $('#firstName').val(),
			lastName: $('#lastName').val(),
			email: $('#email').val(),	
			allergies: $('#allergies').val(),
			dietaryRestrictions: $('#dietaryRestrictions').val(),
			isScout: false,
			isAdult: true
		};
		adults.push(adult);
		saveParticipant(adult);
		fillCart();
	}

	function addSibling() {
		var form = $('#participantForm');	
		var sibling = {
			firstName: $('#firstName').val(),
			lastName: $('#lastName').val(),
			age: $('#age').val(),
			allergies: $('#allergies').val(),
			dietaryRestrictions: $('#dietaryRestrictions').val(),
			isScout: false,
			isAdult: false
		};
		siblings.push(sibling);
		saveParticipant(sibling);
		fillCart();
	}

	function fillCart() {
		var itemNumber = 0;
		var items = [];
		if (scouts.length > 0) {
			items.push({ 
				name:'Scout ' + event.name + ' registration',
				amount: calculateUnitPrice(scoutPrice),
				quantity: scouts.length,
				itemNumber: ++i
			})
		}
		if (siblings.length > 0) {
			items.push({ 
				name:'Sibling ' + event.name + ' registration',
				amount: calculateUnitPrice(siblingPrice),
				quantity: siblings.length,
				itemNumber: ++i
			})
		}
		if (adults.length > 0) {
			items.push({ 
				name:'Adult ' + event.name + ' registration',
				amount: calculateUnitPrice(adultPrice),
				quantity: adults.length,
				itemNumber: ++i
			})
		}
		if (scouts.length > 0 || siblings.length > 0 || adults.length > 0) {
			items.push({ 
				name:'Processing fee',
				amount: 0.30,
				quantity: 1,
				itemNumber: ++i
			});
		}
		$('#checkout').html(Mustache.render(checkoutTemplate, { 
			items: items,
			businessId: businessId,
			notifyUrl: notifyUrl,
			iconUrl: iconUrl,
			returnUrl: returnUrl,
			custom: registrationId
		}));
	}

	function findScout(firstName) {
		var scout = null;
		for (var i = 0; i < scouts.length; i++) {
			// TODO: Maybe add index column
			if (scouts[i].firstName == firstName) {
				scout = scouts[i];
				break;
			}
		}
		return scout;
	}

	function findAdult(firstName) {
		var adult = null;
		for (var i = 0; i < adults.length; i++) {
			// TODO: Maybe add index column
			if (adults[i].firstName == firstName) {
				adult = adults[i];
				break;
			}
		}
		return adult;
	}

	function findSibling(firstName) {
		var sibling = null;
		for (var i = 0; i < siblings.length; i++) {
			// TODO: Maybe add index column
			if (siblings[i].firstName == firstName) {
				sibling = siblings[i];
				break;
			}
		}
		return sibling;
	}

	function saveParticipant(p) {
		var participant = {
			first_name: p.firstName,
			last_name: p.lastName,
			email: p.email || null,
			age: p.age || null,
			age: p.den || null,
			participant_type: p.isAdult ? 'adult' : p.isScout ? 'scout' : 'sibling',
			allergies: p.allergies,
			dietary_restrictions: p.dietaryRestrictions,
			event_id: eventId,
			registration_id: registrationId
		};
		var xhr = new XMLHttpRequest();
		xhr.onload = function(e) {
			resp = JSON.parse(xhr.response);
			if (window.console) {
				console.log(resp);
			}
			if (resp.participant_type == 'scout') {
				var s = findScout(resp.first_name);
				s.synced = true;
			}
			if (resp.participant_type == 'sibling') {
				var sib = findSibling(resp.first_name);
				sib.synced = true;
			}
			if (resp.participant_type == 'adult') {
				var a = findAdult(resp.first_name);
				a.synced = true;
			}
		};
		var url = basePath + '/events/' + eventId + '/participants';
		xhr.open('POST',url);
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.send(JSON.stringify(participant));
	}

	function loadView(e) {
		$ = jQuery;
		if (e) {
			markLoaded(e.target);
		}
		if (viewLoading || !canLoadView()) {
			return;
		}
		viewLoading = true;
		var xhr = new XMLHttpRequest();
		xhr.onload = function(e) {
			viewSrc = xhr.response;
			if (documentLoaded) {
				script.after(createFragment(viewSrc));				
				bindModal();
				parseTemplate();
				populateData();
			}
		};
		var url = scriptPath.replace('.js', '.html').replace('/js','');
		xhr.open('GET',url);
		xhr.send();
	}

	function bindModal() {
		$(document).on('show.bs.modal', '#addParticipant', onModalShow); 
		$(document).on('click', '#add', onSubmit);
	}

	function render() {
		$('#event').html(Mustache.render(eventTemplate, event));
		$('#scouts').html(Mustache.render(template, { participantType: 'Scouts', participants: scouts }));
		$('#siblings').html(Mustache.render(template, { participantType: 'Siblings', participants: siblings }));
		$('#adults').html(Mustache.render(template, { participantType: 'Adults', participants: adults }));
	}
	
	function onSubmit() {
		var modal = $('#addParticipant');
		var which = modal.attr('data-which');
		if (which === 'scout') {
			addScout();
		}
		else if (which === 'adult') {
			addAdult();
		}	
		else {
			addSibling();
		}
		modal.modal('hide');
		render();
	}

	function onModalShow(event) {
  		var button = $(event.relatedTarget);
  		var which = button.data('which');
  		var modal = $(this);
  		modal.find('.modal-title').text('Add ' + which);
		if (which !== 'adult') {
			modal.find('label[for=email]').hide();
			$('#email').hide();
			modal.find('label[for=age]').show();
			$('#age').show();
		}
		else {
			modal.find('label[for=email]').show();
			$('#email').show();
			modal.find('label[for=age]').hide();
			$('#age').hide();
		}
		if (which !== 'scout') {
			modal.find('label[for=den]').hide();
			$('#den').hide();
		}
		else {
			modal.find('label[for=den]').show();
			$('#den').show();
		}
		modal.attr('data-which', which);
		$('#firstName').val('');
		$('#lastName').val('');
		$('#email').val('');
		$('#den').val('');
		$('#age').val('');
		$('#allergies').val('');
		$('#dietaryRestrictions').val('');
		$('#firstName').focus();
	}

	function strip(str) {
    		return str.replace(/^\s+|\s+$/g, '');
	}

	function parseTemplate() {
		template = strip($('#participantTemplate')[0].innerHTML);
		eventTemplate = strip($('#eventTemplate')[0].innerHTML);
		checkoutTemplate = strip($('#paymentFormTemplate')[0].innerHTML);
		Mustache.parse(template);
		Mustache.parse(eventTemplate);
		Mustache.parse(checkoutTemplate);
	}

	function calculateUnitPrice(price) {
		// PayPal rate is 0.029% + $0.30
		// x = subTotal + .029x
		// .971x = subTotal
		// x = subTotal / .971
		return price / .971;
	}

	function calculateSubtotal(items, price) {
		// PayPal rate is 0.029% + $0.30
		// x = subTotal + .029x
		// .971x = subTotal
		// x = subTotal / .971
		return items.length * price / .971;
	}

	function calculateTotal() {
		return calculateSubtotal(scouts, scoutPrice) + calculateSubtotal(siblings, siblingPrice) + calculateTotal(adults, adultPrice) + 0.30;
	}

	document.onreadystatechange = function (e) {
		if (document.readyState == 'interactive') {
			documentLoaded = true;
			if (viewSrc != null) {
				script.after(createFragment(viewSrc));
				bindModal();
				parseTemplate();
			}
		}
	};
	
})();