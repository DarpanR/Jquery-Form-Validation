$.extend ($.fn, {
	validation : function () {
		return $.fetchValidator (this).form;
	}, 

	initiate : function (rules, types, options) {
		let validator = $.fetchValidator (this);
		$(validator).addRule ($.fn.defaultRule);
		$(validator).addType ($.fn.defaultType);

		if (rules != undefined) {
			$(validator).iterateOverArray (rules, $.fn.addRule);
		}

		if (types != undefined) {
			$(validator).iterateOverArray (types, $.fn.addType);
		}

		if (options != undefined) {
			$(validator).addOption (options);
		};
		
		for (let i in validator.options) {
			let option = validator.options[i];

			for (let alts in option) {
				let setting  = option[alts];

				if (!setting.selector) {
					setting.selector = option.main.selector ||
					$.fn.defaultOption[i].selector;
				}

				if (!setting.event) {
					setting.selector = option.main.event ||
					$.fn.defaultOption[i].event;
				}

				if (!setting.handler) {
					setting.handler = $.fn.defaultOption[i].handler;
				}	

				if (!setting.handler instanceof Function) {
					console.log ("The option for '" + i + "' in setting '" + setting + "' does not have valid handler.");
	 				return this;
	 			}

	 			if (!(setting.selector || setting.event || setting.handler)) {
					console.log ("Option '" + i + "' has empty settings in '" + setting + "'.");
					return this;
				}

				if (setting.event == "submit") {
					setting.event = "click";
				}

				$(setting.selector).on (setting.event, function (event) {
					validator.event = setting.event;
					setting.handler.call ($(setting.selector), event);
				});
			}
		}
		validator.submit = validator.form.find (validator.options.submit.main.selector);

		if (!validator.submit) {
			console.log ("Validator couldn't find a valid submit action.");
			return this;
		}

		for (i = 0; i < validator.rules.length; i++) {
			let rule = validator.rules[i];

			if (rule.event == undefined || rule.event == "" || rule.event == "submit") {
				rule.event = "click";
				rule.selector = rule.selector || validator.options.submit.main.selector ||
				$.fn.defaultOption.submit.selector;
				//rules with submit event will be handled directly by validate call;
				if (rule.handler) {
					continue;
				} else {
					return this;
				}
			}

			if (rule.selector == undefined || rule.selector == "") {
				rule.selector = "all";
			}

			if (!(rule.handler instanceof Function)) {
				console.log ("The rule for '" + rule.selector + "' does not have valid handler.");
 				return this;
 			}

 			if (!rule.handler.call (validator.form[0]) instanceof String) {
 				console.log ("The rule for '" + rule.selector + "' does not return a valid string type.");
				return this;
			}
			if (!(rule.event || rule.selector || rule.handler)) {
 				console.log ("The rule for '" + rule.selector + "' is missing some values.");
				return this;
			}

			$.each ((rule.selector == "all") ? validator.form : 
				validator.form.find (rule.selector), function () {
					console.log (this);
				$(this).on (rule.event, function () {
					let message = rule.handler.call (this);
					$(this).errorHandling (message);

					if (message != "" || !message) {
						validator.valid = false;
					}
				});
			});
		}

		for (i = 0; i < validator.types; i++) {
			let type = validator.types[0];

			if (!(type.selector && type.handler)) {
				console.log ("Missing all parameters from type");
				delete validator.types[0];
			}

			if (!type.handler || !(type.handler instanceof Function)) {
				type.handler = function () {
					return true;
				}
			}
			validator.types[0] = type;
		}
		return this;
	},

	validate : function () {
		let validator = $.fetchValidator (this);

		if (!validator) {
			return false;
		}
		validator.valid = true;

		for (i = 0; i < validator.rules.length; i++) {
			let rule = validator.rules[i];

			$.each ((rule.selector == "all") ? validator.form[0] :
				validator.form.find (rule.selector), function () {
				if ((validator.event == "submit" || validator.event == rule.event) &&
					//this prevents double trigger when pressing enter to submit or reset.
					!$(this).is (validator.submit || validator.reset)) {
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
			err.hide ()
		}
		return this;
	},

	formData : function () {
		let validator = $.fetchValidator (this);
		validator.formData = {};

		if (validator.valid) {
			validator.formData[validator.submit.attr ("name")] = validator.submit.val ();

			for (let type in validator.types) {
				$.each (validator.form.find ( type.selector), function () {
					if (type.handler.call (this)) {
						if (!($(this).attr ("name") in validator.formData)) {
							validator.formData[$(this).attr ("name")] = $(this).val ();
						}
					} else if (!($(this).attr ("name") in validator.formData)) {
						delete validator.formData[$(this).attr ("name")];
					}
				});
			}
		}
		return validator.formData;
	}, 

	addType : function (selector, handler) {
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

	defaultType : {
		selector : ["[type=text]", "[type=textarea]", "[type=number]", "[type=email]",
			"[type=password]", "[type=date]", "[type=week]", "[type=month]", "[type=time]",
			"[type=tel]", "[type=url]", "[type=range]", "[type=color]", "[type=image]",
			"[type=file]", "[type=datetime-local]", "select", "[type=checkbox]"],
		handler : function () {
			if ($(this).is ("[type=checkbox]")) {
				return object[0].checked;
			}

			if ($(this).val () == "") {
				return false;
			}
			return true;
		}
	},

	addRule : function (event, selector, handler) {
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
			handler : handler,
		});
		return this;
	},

	defaultRule : {
		event : "submit",
		selector : "[required]:visible",
		handler : function () {
			if ($(this).val () == "") {
				return "<p>Please fill out this field.<p>";
			}
			return "";
		}
	},

	addOption : function (options) {
		if (!options) {
			return this;
		}
		let validator = $.fetchValidator (this);

		$.each (options, function (i, option) {
			let vSetting = validator.options[i] || {};

			$.each (option, function (j, setting) {
				vSetting[j] = vSetting[j] || setting;
			});
			validator.options[i] = vSetting;
		});
		return this;
	},

	defaultOption : {
		submit : {
			selector : "[type=submit], [name=submit]",
			event : "submit"
		}, reset : {
			selector : "[type=reset], [name=reset]",
			event : "reset"
		}
	},

	iterateOverArray : function (array, handler) {
		if (!array.length) {
			return false;
		}

		for (i = 0; i < array.length; i++) {
			if (Array.isArray (array[i])) {
				// console.log ("this object is an array, cannot iterate over the array when the object within the array is an array.");
				return false;
			}
			handler.call (this, array[i]);
		}
		return this;
	}
});

$.validator = function (form) {
	if (!($(form).is ("form") || form.length)) {
		return false;
	}
	this.form = $(form);
	this.form.attr ("novalidate", "novalidate");

	this.valid = false;
	this.event = "none";

	this.rules = [];
	this.types = [];
	this.options = {};
	this.formData = {};
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
	return false;
};