$.extend ($.fn, {
	validation : function () {
		return $.fetchValidator (this).form;
	},

	initiate : function (rules, types, options, submit, reset) {
		let validator = $.fetchValidator (this);
		$(validator).addRule ($.fn.defaults.rules);
		$(validator).addType ($.fn.defaults.types);
		$(validator).addOption ($.fn.defaults.options);

		if (rules != undefined) {
			$(validator).addRule (rules);
		}

		if (types != undefined) {
			$(validator).addType (types);
		}

		if (options != undefined) {
			$(validator).addOption (options);
		}

		if (submit != undefined) {
			$(validator).submit (submit);
		}

		if (reset != undefined) {
			$(validator).reset (reset);
		}

		for (let i = 0; i < validator.rules.length; i++) {
			let rule = validator.rules[i];

			if (rule.event == undefined || rule.event == "") {
				rule.event = "submit";
				rule.selector = rule.selector || validator.submit.selector || $.fn.defaults.submit.selector;
			}

			if (rule.selector == undefined || rule.selector == "") {
				rule.selector = "all";
			}

			if (!(rule.handler instanceof Function)) {
				throw new Error ("The rule for '" + rule.selector + "' does not have valid handler.");
 			}

 			if (!rule.handler.call (this) instanceof String) {
 				throw new Error ("The rule for '" + rule.selector + "' does not return a valid error code.");
			}

			//rules with submit event will be handled directly by validate call.
			if (rule.event == "submit") {
				validator.rules[i] = rule;
				continue;
			}

			$.each ((rule.selector == "all") ? validator.form[0] : 
				$(rule.selector), function () {
				$(this).on (rule.event, function () {
					let message = rule.handler.call (this);
					$(this).errorHandling (message);

					if (message != "" || !message) {
						validator.valid = false;
					}
				});
			});
		}

		//This block checks the types array for empty parameters.
		for (i = 0; i < validator.types.length; i++) {
			let type = validator.types[i];

			if (!(type.selector && type.handler)) {
				console.log ("Missing all parameters from type");
				delete validator.types[i];
				continue;
			}

			if (type.selector == undefined || type.selector == "") {
				type.selector = "all";
			}

			if (!type.handler || !(type.handler instanceof Function)) {
				type.handler = function () {
					return true;
				}
			}
			validator.types[i] = type;
		}

		for (let option of validator.options) {
			let main = option.main;
			main.event = main.event || "click";
			main.selector = main.selector || "all";

			if (option.subs.length) {
				for (let sub of option.subs) {
					sub.selector = sub.selector || main.selector;
					sub.event = sub.event || main.event;

					if (sub.handler == undefined || !(sub.handler instanceof Function)) {
						console.log ();
						delete (sub);
						continue;
					}

					$(sub.selector).on (sub.event, function (event) {
						if ($(this).is (":focus")) {
							validator.event = (sub.event == "submit") ? "click" : sub.event;
							sub.handler.call ($(this, event));
						}
					});
				}
			} else if (main.handler != undefined && main.handler instanceof Function) {
				$(main.selector).on (main.event, function (event) {
					if ($(this).is (":focus")) {
						validator.event = (main.event == "submit") ? "click" :  main.event;
						main.handler.call (this, event);
					}
				});
			} else {
				delete (validator.options[option]);
			}
		}
		submit = validator.submit;

		if (!submit) {
			submit = $.fn.defaults.submit;
		}

		if (!$(submit.selector).length) {
			if ($($.fn.defaults.submit.selector).length) {
				submit.selector = $.fn.defaults.submit.selector;
			} else {
				throw new Error ("There is no 'submit' set for this form.");
			}
		}

		if (submit.handler == undefined || !submit.handler instanceof Function) {
			submit.handler = $.fn.defaults.submit.handler;
		}

		if (submit.event == undefined || submit.event == "") {
			submit.event = $.fn.defaults.submit.event;
		}		

		$(submit.selector).on (submit.event == "submit" ? "click" : submit.event, function () {
			validator.event = "submit";
			submit.handler.call (this);
		});
		validator.submit = submit;
		reset = validator.reset;

		if (!reset) {
			reset = $.fn.defaults.reset;
		}

		if (!$(reset.selector).length) {
			if ($($.fn.defaults.reset.selector).length) {
				reset.selector = $.fn.defaults.reset.selector;
			} else {
				console.log ("There is no 'reset' set for this form.");
			}
		}

		if (reset.handler == undefined || !reset.handler instanceof Function) {
			reset.handler = $.fn.defaults.reset.handler;
		}

		if (reset.event == undefined || reset.event == "") {
			reset.event = $.fn.defaults.reset.event;
		}

		$(reset.selector).on (reset.event == "reset" ? "click" : reset.event, function () {
			validator.event = "reset";
			reset.handler.call ($(this));
		});
		validator.reset = reset;
		return this;
	},

	validate : function () {
		let validator = $.fetchValidator (this);
		validator.valid = true;

		for (let rule of validator.rules) {
			$.each ((rule.selector == "all") ? validator.form[0] : $(rule.selector), function () {
				if ((validator.event == "submit" || validator.event == rule.event) &&
					//this prevents double trigger when keying enter to submit or reset.
					!$(this).is (validator.submit.selector || validator.reset.selector)) {
					let message = rule.handler.call (this);
					$(this).errorHandling (message);

					if (message != "") {
						validator.valid = false;
					}
				}
			});
		}
		validator.event = "none";
		return validator.valid;
	},

	errorHandling : function (message) {
		let err = this.prev ("div.error");

		if (message != undefined && message != "") {
			if (err.length) {
				err.val (message);
			} else {
				err = this.before ("<div class=error>" + message + "</div>");
			}
			err.show ();
		} else if (err.length) {
			err.hide ();
		}
		return this;
	},

	formData : function () {
		let validator = $.fetchValidator (this);
		validator.formData = {};

		if (validator.valid) {
			validator.formData[$(validator.submit.selector).attr ("name")] = $(validator.submit.selector).val ();

			for (let type of validator.types) {
				$.each ($(type.selector), function () {
					if (type.handler.call (this)) {
						if (!$(this).attr ("name") in validator.formData) {
							validator.formData[$(this).attr ("name")] = $(this).val ();
						}
					} else if (!$(this).attr ("name") in validator.formData) {
						delete validator.formData[$(this).attr ("name")];
					}
				});
			}
		}
		return validator.formData;
	},

	addRule : function (event, selector, handler) {
		if (event == undefined) {
			return this;
		}

		if (event == "nodefault") {
			$.fn.defaults.rules = [];
			return this;
		}
		let validator = $.fetchValidator (this);

		if (Array.isArray (event)) {
			$(validator).iterateOverArray (event, $.fn.addRule);
			return this;
		}

		if (event instanceof Object) {
			handler = event.handler;
			selector = event.selector.toString ();
			event = event.event;
		}

		if (event instanceof Function) {
			handler = event;
			selector = "all";
			event = "submit";
		}

		if (selector instanceof Function) {
			handler = selector;
			selector = event.toString ();
			event = "submit";
		}

		validator.rules.push ({
			event : event,
			selector : selector.toString (),
			handler : handler
		});
		return this;
	},

	addOption : function (main, subs = []) {
		if (main == undefined) {
			return this;
		}

		if (main == "nodefault") {
			$.fn.defaults.options = [];
			return this;
		}
		let validator = $.fetchValidator (this);

		if (Array.isArray (main)) {
			$(validator).iterateOverArray (main, $.fn.addOption);
		}
		let option = {"main" : main, "subs": []};

		if (!Array.isArray (subs)) {
			if (subs.event || subs.selector || subs.handler) {
				options.subs.push (subs);
			}
		} else {
			for (let sub of subs) {
				if (sub.event || sub.selector || sub.handler) {
					options.subs.push (sub);
				}
			}
		}
		validator.options.push (option);
		return this;
	},

	addType : function (selector, handler) {
		if (selector == undefined) {
			return this;
		}

		if (selector == "nodefault") {
			$.fn.defaults.types = [];
			return this;
		}
		let validator = $.fetchValidator (this);

		if (Array.isArray (selector)) {
			$(validator).iterateOverArray (selector, $.fn.addType);
			return this;
		}

		if (selector instanceof Function) {
			handler = selector;
			selector = "all";
		}

		if (selector instanceof Object) {
			handler = selector.handler;
			selector = selector.selector;
		}

		validator.types.push ({
			selector : selector.toString (),
			handler : handler
		});
		return this;
	},

	submit : function (event, selector, handler) {
		if (event == undefined) {
			return this;
		}
		
		if (event instanceof Object) {
			handler = event.handler;
			selector = event.selector.toString ();
			event = event.event;
		}

		if (event instanceof Function) {
			handler = event;
			selector = "all";
			event = "submit";
		}

		if (selector instanceof Function) {
			handler = selector;
			selector = event.toString ();
			event = "submit";
		}

		$.fetchValidator (this).submit = {
			event : event,
			selector : selector,
			handler : handler
		}
		return this;
	},

	reset : function (event, selector, handler) {
		if (event == undefined) {
			return this;
		}

		if (event instanceof Object) {
			handler = event.handler;
			selector = event.selector.toString ();
			event = event.event;
		}

		if (event instanceof Function) {
			handler = event;
			selector = "all";
			event = "reset";
		}

		if (selector instanceof Function) {
			handler = selector;
			selector = event.toString ();
			event = "reset";
		}

		$.fetchValidator (this).reset = {
			event : event,
			selector : selector,
			handler : handler
		}
		return this;
	},

	iterateOverArray : function (array, handler) {
		if (!Array.isArray (array)) {
			throw new Error ("Not an array, can not iterated over.");
		}

		for (let arr of array) {
			if (Array.isArray (arr)) {
				// console.log ("this object is an array, cannot iterate over the array when the object within the array is an array.");
				return false;
			}
			handler.call (this, arr);
		}
		return this;
	},

	defaults : {
		submit : {
			selector : "[type=submit], [name=submit], #submit",
			event : "submit",
			handler : function () {
				console.log ("No submit methods are set yet. Please change this under the `submit` method.");
			}
		}, reset : {
			selector : "[type=reset], [name=reset], #reset",
			event : "reset",
			handler : function () {
				console.log ("No reset methods are set yet. Please change this under the `reset` method.");
			}
		}, rules : {
			event : "submit",
			selector : "[required]:visible",
			handler : function () {
				if ($(this).val () == "") {
					return "<p>Please fill out this field.<p>";
				}
				return "";
			}
		}, types : {
			selector : ["[type=text]", "[type=textarea]", "[type=number]", "[type=email]",
				"[type=password]", "[type=date]", "[type=week]", "[type=month]", "[type=time]",
				"[type=tel]", "[type=url]", "[type=range]", "[type=color]", "[type=image]",
				"[type=file]", "[type=datetime-local]", "select", "[type=checkbox]"],
			handler : function () {
				if ($(this).is ("[type=checkbox]")) {
					return this.checked;
				}

				if ($(this).val () == "") {
					return false;
				}
				return true;
			}
		}, options : []
	},

	ajax : function (path) {
		let validator = $.fetchValidator (this);

		if (path != undefined || path != "") {
			$.fetchValidator (this).ajax = path;
		} 

		if (validator.ajax != undefined || validator.ajax != "") {
			throw new Error ("No ajax path set");
		}
		return $.fetchValidator (this).ajax;
	}
});

$.validator = function (form) {
	if (!($(form).is ("form") || form.length)) {
		throw new Error ();
	}
	this.form = $(form);
	this.form.attr ("novalidate", "novalidate");

	this.ajax = "";
	this.valid = false;
	this.event = "none";

	this.rules = [];
	this.types = [];
	this.options = [];
	this.formData = {};
	this.submit = {};
	this.reset =  {};
	return this;
};

$.fetchValidator = function (object) {
	if (object instanceof $.validator) {
		// console.log ("the object is a validator");
		return object;
	} else if (object[0] instanceof $.validator) {
		// console.log ("the object inside is a validator");
		return object[0];
	} else if (object[0] && ($(object[0]).is ("form") || object[0].nodeName == "FORM")) {
		// console.log ("this object is a form");
		return $.data (object[0], "validator") || $.data (object[0], "validator", new $.validator (object[0]));
	}
	// console.log ("No Valdator found");
	throw new Error ("No validator found");
};