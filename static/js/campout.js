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
	var summaryTemplate = null;
	var event = null;
	var eventPrices = null;
	var fetchingRegistration = false;
	var registrationId = localStorage.getItem('registrationId');
	var registration = null;
	var scoutPrice = null;
	var siblingPrice = null;
	var adultPrice = null;
	var businessId = null;
	var submissionUrl = null;
	var notifyUrl = null;
	var iconUrl = null;
	var returnUrl = location.href;
	var settings = null;
	var cssBaseFileName = scriptPath.substr(scriptPath.lastIndexOf('/') + 1).replace('.js', '');
	var test = script.hasAttribute('data-test') ? Boolean(script.getAttribute('data-test')) : false;

	function addStyle(callback) {
		var head = document.getElementsByTagName('head')[0];
		if (document.querySelectorAll('link[href*=' + cssBaseFileName + ']').length == 0) {
			var c = document.createElement('link');
			c.rel="stylesheet";
			c.href = scriptPath.replace('.js', '.css').replace('/js','/css');;
			c.onload = callback;
			loading.push(c);
			head.appendChild(c);
		}
	}

	function addFontAwesome(callback) {
		var head = document.getElementsByTagName('head')[0];
		if (document.querySelectorAll('link[href*=font-awesome]').length == 0) {
			var c = document.createElement('link');
			c.rel="stylesheet";
			c.href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.12.1/css/fontawesome.min.css";
			c.integrity="sha256-mM6GZq066j2vkC2ojeFbLCcjVzpsrzyMVUnRnEQ5lGw=";
			c.crossOrigin="anonymous";
			c.onload = callback;
			loading.push(c);
			head.appendChild(c);

			var c1 = document.createElement('link');
			c1.rel="stylesheet";
			c1.href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.12.1/css/regular.min.css";
			c1.integrity="sha256-Pd28JXamAUfl4NS9QzGAdbaqdPQGG9dKLj3caGj28fg=";
			c1.crossOrigin="anonymous";
			c1.onload = callback;
			loading.push(c1);
			head.appendChild(c1);

			var c2 = document.createElement('link');
			c2.rel="stylesheet";
			c2.href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.12.1/css/solid.min.css";
			c2.integrity="sha256-APTxfVyJgjHUS35EeuRpYs2tAbIQO7UF0nAV6krdYJ0=";
			c2.crossOrigin="anonymous";
			c2.onload = callback;
			loading.push(c2);
			head.appendChild(c2);	
		}
	}

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
		return typeof jQuery !== "undefined" && typeof createPopper !== "undefined" && document.querySelectorAll('link[href*=' + cssBaseFileName + ']').length != 0 && document.querySelectorAll('script[src*=bootstrap]').length !== 0 && document.querySelectorAll('link[href*=bootstrap]').length !== 0 && document.querySelectorAll('link[href*=font-awesome]').length == 3 && typeof Mustache !== "undefined";
	}

	if (resourcesLoaded()) {
		loadView();
	}
	else {
		addStyle(loadView);
		addBootstrap(loadView);
		addFontAwesome(loadView);
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

	function getData() {
		getSettings();
		getEvent();
	}

	if (registrationId) {
		notifyUrl = basePath + '/events/' + eventId + '/registrations/' + registrationId + '/ipn';
		if (window.console) {
			console.log('Resuming with registration: ' + registrationId);
		}
		getData();
		getRegistration();
	}
	else {
		getData();
		createRegistration();
	}

	function getRegistration() {
		fetchingRegistration = true;
		var xhr = new XMLHttpRequest();
		xhr.onload = function(e) {
			fetchingRegistration = false;
			r = JSON.parse(xhr.response);

			registration = {
				id: r.id,
				event_id: r.event_id,
				completed: r.completed
			};

			for (var i = 0; i < r.participants.length; i++) {
				var p = r.participants[i];
				if (p.participant_type == 'scout') {
					scouts.push({
						id: p.id,
						firstName: p.first_name,
						lastName: p.last_name,
						age: p.age,
						den: p.den,
						allergies: p.allergies,
						dietaryRestrictions: p.dietary_restrictions,
						isScout: true
					});
				}
				else if (p.participant_type == 'sibling') {
					siblings.push({
						id: p.id,
						firstName: p.first_name,
						lastName: p.last_name,
						age: p.age,
						allergies: p.allergies,
						dietaryRestrictions: p.dietary_restrictions
					});
				}
				else if (p.participant_type == 'adult') {
					adults.push({
						id: p.id,
						firstName: p.first_name,
						lastName: p.last_name,
						email: p.email,
						phone: p.phone,
						allergies: p.allergies,
						dietaryRestrictions: p.dietary_restrictions,
						isAdult: true
					});
				}
			}

			populateData();
		};
		var url = basePath + '/events/' + eventId + '/registrations/' + registrationId + '?' + String((new Date()).getTime());
		xhr.open('GET',url);
		xhr.send();
	}

	function getSettings() {
		var xhr = new XMLHttpRequest();
		xhr.onload = function(e) {
			s = JSON.parse(xhr.response);
			// TODO: Icon url?
			settings = {
				businessId: s.business_id,
				submissionUrl: s.submission_url
			};
			businessId = settings.businessId;
			submissionUrl = settings.submissionUrl;
			populateData();
		};
		var url = basePath + '/settings?test='  + (test ? 'true': 'false') +  '&' + String((new Date()).getTime());
		xhr.open('GET',url);
		xhr.send();
	}

	function getEvent() {
		var xhr = new XMLHttpRequest();
		xhr.onload = function(e) {
			evt = JSON.parse(xhr.response);

			event = {
				id: evt.id,
				name: evt.name,
				date: evt.date,
				description: evt.description
			};
			
			eventPrices = [];
			for (var i = 0; i < evt.prices.length; i++) {
				var p = evt.prices[i];
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
		var url = basePath + '/events/' + eventId + '?' + String((new Date()).getTime());
		xhr.open('GET',url);
		xhr.send();
	}

	function canPopulateData() {
		return registrationId != null && settings != null && !fetchingRegistration && viewSrc != null && event != null && eventPrices != null;
	}

	function populateData() {
		if (canPopulateData()) {
			render();
			fillCart();
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

	function editParticipant(id) {
		var p = findParticipant(id);
		p.firstName = $('#firstName').val();
		p.lastName = $('#lastName').val();
		p.allergies = $('#allergies').val();
		p.dietaryRestrictions = $('#dietaryRestrictions').val();
		if (p.isScout) {
			p.den = $('#den').val();
		}
		if (p.isAdult) {
			p.email = $('#email').val();
			p.phone = $('#phone').val();
		}
		if (!p.isAdult) {
			p.age = $('#age').val();
		}
		saveParticipant(p);
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
			phone: $('#phone').val(),	
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
		var i = 0;
		var items = [];
		if (scouts.length > 0) {
			items.push({ 
				name:'Scout ' + event.name + ' registration',
				amount: calculateUnitPrice(scoutPrice).toFixed(2),
				quantity: scouts.length,
				itemNumber: ++i
			})
		}
		if (siblings.length > 0) {
			items.push({ 
				name:'Sibling ' + event.name + ' registration',
				amount: calculateUnitPrice(siblingPrice).toFixed(2),
				quantity: siblings.length,
				itemNumber: ++i
			})
		}
		if (adults.length > 0) {
			items.push({ 
				name:'Adult ' + event.name + ' registration',
				amount: calculateUnitPrice(adultPrice).toFixed(2),
				quantity: adults.length,
				itemNumber: ++i
			})
		}
		if (scouts.length > 0 || siblings.length > 0 || adults.length > 0) {
			items.push({ 
				name:'Processing fee',
				amount: 0.30.toFixed(2),
				quantity: 1,
				itemNumber: ++i
			});
		}

		if (!registration || !registration.completed) {
			$('#summary').html(Mustache.render(summaryTemplate, {
				items: items
			}));
		}
		else {
			$('#finalSummary').html(Mustache.render(summaryTemplate, {
				items: items
			}));
		}

		if (!registration || !registration.completed) {
			var checkoutHtml = Mustache.render(checkoutTemplate, { 
				items: items,
				businessId: businessId,
				submissionUrl: submissionUrl,
				notifyUrl: notifyUrl,
				iconUrl: iconUrl,
				returnUrl: returnUrl,
				custom: encodeURIComponent(JSON.stringify({ registration_id: registrationId, test: test }))
			});

			$('#checkout').html(checkoutHtml);
		}
	}

	function findScout(id) {
		var scout = null;
		for (var i = 0; i < scouts.length; i++) {
			if (scouts[i].id == id) {
				scout = scouts[i];
				break;
			}
		}
		return scout;
	}

	function findAdult(id) {
		var adult = null;
		for (var i = 0; i < adults.length; i++) {
			if (adults[i].id == id) {
				adult = adults[i];
				break;
			}
		}
		return adult;
	}

	function findSibling(id) {
		var sibling = null;
		for (var i = 0; i < siblings.length; i++) {
			if (siblings[i].id == id) {
				sibling = siblings[i];
				break;
			}
		}
		return sibling;
	}

	function findParticipant(id) {
		return findScout(id) || findSibling(id) || findAdult(id);
	}

	function saveParticipant(p) {
		var participant = {
			first_name: p.firstName,
			last_name: p.lastName,
			email: p.email || null,
			phone: p.phone || null,
			age: p.age || null,
			den: p.den || null,
			participant_type: p.isAdult ? 'adult' : p.isScout ? 'scout' : 'sibling',
			allergies: p.allergies,
			dietary_restrictions: p.dietaryRestrictions,
			event_id: eventId,
			registration_id: registrationId
		};

		if (p.id) {
			participant.id = p.id;
		}

		var xhr = new XMLHttpRequest();
		xhr.onload = function(e) {
			resp = JSON.parse(xhr.response);
			if (window.console) {
				console.log(resp);
			}
			p.id = resp.id;
			p.synced = true;
			populateData();
		};
		var url = basePath + '/events/' + eventId + '/participants';
		xhr.open('POST',url);
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.send(JSON.stringify(participant));
	}

	function deleteScout(id) {
		var ndx = -1;
		for (var i = 0; i < scouts.length; i++) {
			if (scouts[i].id == id) {
				ndx = i;
				break;
			}
		}
		if (ndx > -1) {
			scouts.splice(ndx, 1);
		}
	}

	function deleteAdult(id) {
		var ndx = -1;
		for (var i = 0; i < adults.length; i++) {
			if (adults[i].id == id) {
				ndx = i;
				break;
			}
		}
		if (ndx > -1) {
			adults.splice(ndx, 1);
		}
	}

	function deleteSibling(id) {
		var ndx = -1;
		for (var i = 0; i < siblings.length; i++) {
			if (siblings[i].id == id) {
				ndx = i;
				break;
			}
		}
		if (ndx > -1) {
			siblings.splice(ndx, 1);
		}
	}

	function deleteParticipant(id) {

		var xhr = new XMLHttpRequest();
		xhr.onload = function(e) {
			resp = JSON.parse(xhr.response);
			if (window.console) {
				console.log(resp);
			}
			if (resp.participant_type == 'scout') {
				deleteScout(resp.id);
			}
			if (resp.participant_type == 'sibling') {
				deleteSibling(resp.id);
			}
			if (resp.participant_type == 'adult') {
				deleteAdult(resp.id);
			}
			populateData();
		};
		var url = basePath + '/events/' + eventId + '/participants/' + id;
		xhr.open('DELETE',url);
		xhr.send();
	}

	function handleViewLoaded() {
		if (viewSrc != null && documentLoaded) {	
			bindModal();
			bindNextButtons();
			bindPrevButtons();
			bindDeleteButtons();
			bindEditButtons();
			bindFieldBlur();
			parseTemplate();
			populateData();
		}
	}

	function loadView(e) {
		$ = jQuery;
		if ($('#event').length > 0) {
			/* Pre-loaded view */
			handleViewLoaded();
		}
		else {
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
				script.after(createFragment(viewSrc));
				handleViewLoaded();
			};
			var url = scriptPath.replace('.js', '.html').replace('/js','');
			xhr.open('GET',url);
			xhr.send();
		}
	}

	function bindModal() {
		$(document).on('show.bs.modal', '#addParticipant', onModalShow);
		$(document).on('hidden.bs.modal', '#addParticipant', onModalHidden);
		$(document).on('click', '#add', onSubmit);
	}

	function bindNextButtons() {
		$(document).on('click', '.next-button', onNextClicked);
	}

	function bindPrevButtons() {
		$(document).on('click', '.prev-button', onPrevClicked);
	}

	function bindDeleteButtons() {
		$(document).on('click', '.delete-participant', onDeleteClicked);
	}

	function bindEditButtons() {
		$(document).on('click', '.edit-participant', onEditClicked);
	}

	function bindFieldBlur() {
		$(document).on('blur', '#participantForm input, #participantForm textarea', onFieldBlur);
	}

	function render() {
		var eventHtml = Mustache.render(eventTemplate, event);
		var scoutsHtml = Mustache.render(template, { participantType: 'Scouts', participants: scouts });
		var siblingsHtml = Mustache.render(template, { participantType: 'Siblings', participants: siblings });
		var adultsHtml = Mustache.render(template, { participantType: 'Adults', participants: adults });
		if (!registration || !registration.completed) {
			$('#event').html(eventHtml);
			$('#scouts').html(scoutsHtml);
			$('#siblings').html(siblingsHtml);
			$('#adults').html(adultsHtml);
		}
		else {
			$('#thanks').html('Thank you for registering!');
			$('#registrationCarousel').hide();
			$('#finalScouts').html(scoutsHtml);
			$('#finalSiblings').html(siblingsHtml);
			$('#finalAdults').html(adultsHtml);
		}
	}
	
	function onDeleteClicked(e) {
		var id = $(e.target).attr('data-id');
		deleteParticipant(id);
	}

	function onNextClicked() {
		$('#registrationCarousel').carousel('next');
	}

	function onPrevClicked() {
		$('#registrationCarousel').carousel('prev');
	}

	function onFieldBlur(e) {
		var valid = Boolean($(e.target).val());
		$(e.target).css('background-color', valid ? 'inherit' : 'pink');
	}

	function onSubmit() {
		var modal = $('#addParticipant');
		var which = modal.attr('data-which');
		var id = modal.attr('data-id');
		
		var inputs = $('#participantForm').find('input:visible, textarea:visible');

		var valid = true;
		inputs.each(function(i, a){
			var tmp = Boolean($(a).val());
			$(a).css('background-color', tmp ? 'inherit' : 'pink');
			valid = valid && tmp;
		});

		if (valid) {
			if (id) {
				editParticipant(id);
			}
			else{
				if (which === 'scout') {
					addScout();
				}
				else if (which === 'adult') {
					addAdult();
				}	
				else {
					addSibling();
				}
			}

			modal.modal('hide');
			render();
		}
	}

	function populateModal(which) {
		var participant = null;
  		var modal = $('#addParticipant');
		var id = modal.attr('data-id');
		if (id) {
		 	participant = findParticipant(id);
		}
  		
  		modal.find('.modal-title').text('Add ' + which);
		if (which !== 'adult') {
			modal.find('label[for=email]').hide();
			$('#email').hide();
			modal.find('label[for=phone]').hide();
			$('#phone').hide();
			modal.find('label[for=age]').show();
			$('#age').show();
		}
		else {
			modal.find('label[for=email]').show();
			$('#email').show();
			modal.find('label[for=phone]').show();
			$('#phone').show();
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

		if (participant) {
			modal.attr('data-id', participant.id);
			$('#firstName').val(participant.firstName);
			$('#lastName').val(participant.lastName);
			$('#email').val(participant.email || '');
			$('#phone').val(participant.phone || '');
			$('#den').val(participant.den || '');
			$('#age').val(participant.age || '');
			$('#allergies').val(participant.allergies || '');
			$('#dietaryRestrictions').val(participant.dietaryRestrictions || '');
		}
		else {
			clearModal();	
		}
		$('#firstName').focus();
	}

	function clearModal() {
		var modal = $('#addParticipant');
		modal.attr('data-id', '');
		$('#firstName').val('');
		$('#lastName').val('');
		$('#email').val('');
		$('#phone').val('');
		$('#den').val('');
		$('#age').val('');
		$('#allergies').val('');
		$('#dietaryRestrictions').val('');
	}

	function onModalShow(event) {
		var which = event.relatedTarget ? $(event.relatedTarget).attr('data-which') : $('#addParticipant').attr('data-which');
  		populateModal(which);
	}

	function onEditClicked(e) {
		var button = $(e.target).is('.edit-participant') ? $(e.target) : $(e.target).parents('.edit-participant');
		var id = button.attr('data-id');
		var which = button.attr('data-which');
		var modal = $('#addParticipant');
		modal.attr('data-id', id);
		modal.attr('data-which', which);
		modal.modal('show'); /* Will trigger onModalShow */
	}

	function onModalHidden(e) {
		clearModal();
	}

	function strip(str) {
    	return str.replace(/^\s+|\s+$/g, '');
	}

	function parseTemplate() {
		template = strip($('#participantTemplate')[0].innerHTML);
		eventTemplate = strip($('#eventTemplate')[0].innerHTML);
		checkoutTemplate = strip($('#paymentFormTemplate')[0].innerHTML);
		summaryTemplate = strip($('#summaryTemplate')[0].innerHTML);
		Mustache.parse(template);
		Mustache.parse(eventTemplate);
		Mustache.parse(checkoutTemplate);
		Mustache.parse(summaryTemplate);
	}

	function calculateUnitPrice(price) {
		// PayPal rate is 2.2% + $0.30
		// x = subTotal + .022x
		// .978x = subTotal
		// x = subTotal / .978
		return price / .978;
	}

	function calculateSubtotal(items, price) {
		// PayPal rate is 2.2% + $0.30
		// x = subTotal + .022x
		// .978x = subTotal
		// x = subTotal / .978
		return items.length * price / .978;
	}

	function calculateTotal() {
		return calculateSubtotal(scouts, scoutPrice) + calculateSubtotal(siblings, siblingPrice) + calculateTotal(adults, adultPrice) + 0.30;
	}

	document.onreadystatechange = function (e) {
		if (document.readyState == 'interactive') {
			documentLoaded = true;
			handleViewLoaded();
		}
	};
	
})();
