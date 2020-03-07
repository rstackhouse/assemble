(function () {

	var loading = [];
	var script = document.currentScript;
	var scriptPath = script.src;
	var basePath = scriptPath.substr(0,script.src.indexOf('/view'));
	var cssBaseFileName = scriptPath.substr(scriptPath.lastIndexOf('/') + 1).replace('.js', '');
	var viewSrc = null;
	var viewLoading = false;
	var documentLoaded = false;
	var eventsTemplate = null;
	var registrationsSummaryTemplate = null;
	var events = null;
	var registrations = null;
	var eventId = null;

	function strip(str) {
    	return str.replace(/^\s+|\s+$/g, '');
	}

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

	function createFragment(htmlStr) {
		var frag = document.createDocumentFragment(), temp = document.createElement('div');
 		temp.innerHTML = htmlStr;
		while(temp.firstChild) {
			frag.appendChild(temp.firstChild);
		}
		return frag;
	}

	function loadView(e) {
		$ = jQuery;
		if ($ && $('#event').length > 0) {
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

	function getEvents() {
		var xhr = new XMLHttpRequest();
		xhr.onload = function(e) {
			evts = JSON.parse(xhr.response);

			events = [];
			for (var i = 0; i < evts.length; i++) {
				var evt = evts[i];
				var event = {
					id: evt.id,
					name: evt.name,
					date: evt.date,
					description: evt.description
				};
				events.push(event);
			}

			if (events.length > 0) {
				eventId = events[0].id;
				getRegistrations();
			}

			populateData();
		};

		/* TODO: Add query param to filter out past events. */
		var url = basePath + '/events';
		xhr.open('GET',url);
		xhr.send();
	}

	function getRegistrations() {
		var xhr = new XMLHttpRequest();
		xhr.onload = function(e) {
			regs = JSON.parse(xhr.response);

			registrations = [];
			for (var i = 0; i < regs.length; i++) {
				var r = regs[i];
				var registration = {
					id: r.id,
					participants: []
				};

				for (var j = 0; j < r.participants.length; j++) {
					var p = r.participants[j];
					var participant = {
						firstName: p.first_name,
						lastName: p.last_name,
						participantType: p.participant_type,
						email: p.email,
						phone: p.phone,
						age: p.age,
						den: p.den,
						isAdult: p.participant_type == 'Adult',
						isScout: p.participant_type == 'Scout'
					};
					registration.participants.push(participant);
				}

				registrations.push(registration);
			}

			populateData();

		};
		var url = basePath + '/events/' + eventId + '/registrations?' + String((new Date()).getTime());
		xhr.open('GET',url);
		xhr.send();
	}

	function getData(){
		getEvents();	
	}

	getData();

	function handleViewLoaded() {
		if (viewSrc != null && documentLoaded) {	
			parseTemplate();
			/* TODO: Add an event handler for the event picker change. */
			populateData();
		}
	}

	function parseTemplate() {
		eventsTemplate = strip($('#eventsTemplate')[0].innerHTML);
		registrationsSummaryTemplate = strip($('#registrationSummaryTemplate')[0].innerHTML);
	}

	function canPopulateData() {
		return events != null && viewSrc != null;
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

	function render() {
		var eventsHtml = null;
		var registrationsHtml = null;

		if (events) {
			eventsHtml = Mustache.render(eventsTemplate, events);
			$('#events').html(eventsHtml);
		}

		if (registrations) {
			registrationsHtml = Mustache.render(registrationsSummaryTemplate, registrations);
			$('#registrations').html(registrationsHtml);
		}
		$('#loading').hide();
	}

	document.onreadystatechange = function (e) {
		if (document.readyState == 'interactive') {
			documentLoaded = true;
			handleViewLoaded();
		}
	};


})();