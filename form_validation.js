$.extend ($.fn, {
	validation : function () {
		let validator = $.data (this[0], "validator");

		if (!validator) {
			validator = new $.validator (this[0]);
		}
		$.data (this[0], "validator", validator);
		return this;
	}, 

	initiate : function (rules, types, options) {
		let validator = $.fetchValidator (this);

		if (!validator) {
			return false;
		}
		$(validator).addRule ($.fn.defaultRule);
		$(validator).addType ($.fn.defaultType);

		if (rules != undefined) {
			$.iterateOverArray (rules, addRule);
		}

		if (types != undefined) {
			$.iterateOverArray (types, addType);
		}

		if (options != undefined) {
			$(validator).addOption (options);
		}

		$.each (validator.options, function (i, option) {
			if (Object.keys (obj).length) {
				delete validator.options[i];
			}
			let main = validator.options[i].main;

			for (let setting in option) {
				if (!(setting.selector)) {
					setting.selector = main.selector || $.fn.defaultOption[i].selector;
				}

				if (!(setting.event)) {
					setting.selector = main.event || $.fn.defaultOption[i].event;
				}

				if (!(setting.handler)) {
					setting.handlder = defaultOption[i].handler;
				}

				if (!(setting.selector || setting.event || setting.handler)) {
					console.log ("Option '" + i + "' has empty settings in '" + setting + "'.");
					delete option[setting];
				}

				$(setting.selector).on (setting.event, function (event) {
					validator.event = i;
					setting.handler.call (this, event);
				});
			}
		});
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
			let formData = (rule.selector == "all") ? validator.form[0] :
				validator.form.find (rule.selector);

			$.each (formData, function () {
				if ((validator.event == "submit" || validator.event == rule.event) &&
					!$(this).is (validator.submit || validator.reset)) {
					let message = rule.handler ($(this));
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

		if (!validator) {
			return this;
		}
		validator.formData = {};

		if (validator.valid) {
			validator.formData[validator.submit.attr ("name")] = validator.submit.val ();

			$.each (validator.types, function (i, type) {
				let selectors = type.selector;

				if (Array.isArray (selectors)) {
					selectors = type.selector[0];

					for (j = 1; j < type.selector.length; j++) {
						selectors += ", " + type.selector[j];
					}
				}
				$.each (validator.form.find (selectors), function () {
					if (type.handler ($(this))) {
						if (!($(this).attr ("name") in validator.formData)) {
							validator.formData[$(this).attr ("name")] = $(this).val ();
						}
					} else if ($(this).attr ("name") in validator.formData) {
						console.log (this);
						delete validator.formData[$(this).attr ("name")];
					}
				});
			});
		}
		return validator.formData;
	}, 

	addType : function (selector, handler) {
		let validator = $.fetchValidator (this);

		if (!validator) {
			return this;
		}

		if (Array.isArray (selector)) {
			$.iterateOverArray (selectors, addType);
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

		if (!(handler instanceof Function)) {
			handler = function () {
				return true;
			}
		}

		validator.types.push ({
			selector : selector,
			handler : handler
		});
		return this;
	},

	defaultType : {
		selector : ["[type=text]", "[type=textarea]", "[type=number]", "[type=email]",
			"[type=password]", "[type=date]", "[type=week]", "[type=month]", "[type=time]",
			"[type=tel]", "[type=url]", "[type=range]", "[type=color]", "[type=image]",
			"[type=file]", "[type=datetime-local]", "select", "[type=checkbox]"],
		handler : function (object) {
			if (object.is ("[type=checkbox]")) {
				return object[0].checked;
			}

			if (object.val () == "") {
				return false;
			}
			return true;
		}
	},

	addRule : function (event, selector, handler) {
		let validator = $.fetchValidator (this);

		if (!validator) {
			return this;
		}

		if (Array.isArray (event)) {
			$.iterateOverArray (event, addRule);
			return this;
		}

		if (event instanceof Object) {
			handler = event.handler;
			selector = event.selector;
			event = event.event;
		}

		if (event instanceof Function) {
			handler = event;
			selector = "all";
			event = "submit";
		}

		if (selector instanceof Function) {
			handler = selector;
			selector = event;
			event = "submit";
		}

		if (!(handler instanceof Function)) {
			return this;
		}

		if (event !="submit" && selector && handler) {
			let formData = (selector == "all") ? validator.form[0] :
				validator.form.find (selector);

			$.each (formData, function () {
				$(this).on (event, function () {
					let message = handler ($(this));
					$(this).errorHandling (message);

					if (message != "" || message != undefined) {
						validator.valid;
					}
				})
			})
		}
		validator.rules.push ({
			event : event,
			selector : selector,
			handler : handler,
		});
		return this;
	},

	defaultRule : {
		event : "submit",
		selector : "[required]:visible",
		handler : function (object) {
			if (object.val () == "") {
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

		if (!validator) {
			return this;
		}

		$.each (options, function (i, option) {
			let vSetting = validator.options[i];

			$.each (option, function (j, setting) {
				vSetting[j].selector = setting.selector || vSetting.selector;
				vSetting[j].event = setting.event || vSetting.event;
				vSetting[j].handler = setting.handler || vSetting.handler;
			});
			validator.options[i] = vSetting;
		});
	},

	defaultOption : {
		submit : {
			selector : "[type=submit], [name=submit]",
			event : "submit"
		}, reset : {
			selector : "[type=reset], [name=reset]",
			event : "reset"
		}
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
	return form;
};

$.iterateOverArray = function (array, handler) {
	if (!array.length) {
		return array;
	}

	for (i = 0; i < array.length; i++) {
		if (Array.isArray (array[i])) {
			// console.log ("this object is an array, cannot iterate over the array when the object within the array is an array.");
			return array;
		}
		handler (array[i]);
	}
	return array;
};

$.fetchValidator = function (object) {
	if (object instanceof $.validator) {
		// console.log ("the object is a validator");
		return object;
	} else if (object[0] instanceof $.validator) {
		// console.log ("the object inside is a validator");
		return object[0];
	} else if ($(object[0]).is ("form") || object[0].nodeName == "FORM") {
		// console.log ("this object is a form");
		return $.data (object[0], "validator");
	}
	// console.log ("No Valdator found");
	return false;
};