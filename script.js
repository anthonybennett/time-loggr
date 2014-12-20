///////////////////////////////////////////////////////////////////////////////
// References and Additional Reading
//
// On "use strict"        http://goo.gl/vVS7Or
// On NodeList.forEach    http://goo.gl/PTXosZ
// VanillaJS TodoMVC      http://todomvc.com/examples/vanillajs/
// Pikaday                https://github.com/dbushell/Pikaday
///////////////////////////////////////////////////////////////////////////////

(function (doc, storage) {
	"use strict";

	/////////////////////////////////////////////////////
	// Helper Functions and Constants
	/////////////////////////////////////////////////////

	// Get one element.
	var $get = function (selector, context) {
		return (context || doc).querySelector(selector);
	};

	// Get multiple elements.
	var $getAll = function (selector, context) {
		return (context || doc).querySelectorAll(selector);
	};

	// Loop over multiple elements.
	var $forEach = function (nodeList, callback) {
		for (var i = 0, l = nodeList.length; i < l; ++i) {
			callback.call(nodeList[i], nodeList[i], i);
		}
	};

	// Add listener to element.
	var $on = function (element, type, selector, callback) {
		// If given selector and callback.
		if (callback) {
			// Keep reference to original callback.
			var originalCallback = callback;

			// Define new callback.
			callback = function (event) {
				// Target must match selector.
				if (event.target.matches(selector)) {
					// Call original callback.
					originalCallback.call(this, event, event.target);
				}
			};
		// Otherwise.
		} else {
			// Selector is callback.
			callback = function (event) {
				selector.call(this, event, event.target);
			};
		}

		// Add event listener to element.
		element.addEventListener(type, callback);
	};

	// Compute offset top for element.
	var $offsetTop = function (element) {
		var offsetTop = 0;
		while (element) {
			offsetTop += element.offsetTop;
			element = element.offsetParent;
		}
		return offsetTop;
	};

	// Common key codes.
	var keyCodes = {
		TAB: 9,
		ENTER: 13,
		SHIFT: 16,
		SPACE: 32,
		UP: 38,
		DOWN: 40
	};

	/////////////////////////////////////////////////////
	// Application Code (Data Model and Modules)
	/////////////////////////////////////////////////////

	// Data model.
	var model = {
		init: function () {
			// Initialize date to today.
			this.date = new Date();

			// Load items from local storage.
			this.items = (storage.getItem("items") || []);

			// Decode JSON as needed.
			if ("string" == typeof this.items) {
				this.items = JSON.parse(this.items);
			}
		},
		getDate: function () {
			// Break date apart into YYYY, M, and D.
			var year = this.date.getFullYear(),
				month = (this.date.getMonth() + 1),
				day = this.date.getDate();

			// Combine and return as YYYY-MM-DD.
			return (year + "-" +
					((month < 10) ? "0" : "") + month + "-" +
					((day < 10) ? "0" : "") + day);
		},
		setDate: function (value) {
			// Set date as YYYY/MM/DD.
			this.date = new Date(value.replace("-", "/"));
		},
		saveItems: function () {
			// Update local storage.
			if (this.items.length) {
				storage.setItem("items", JSON.stringify(this.items));
			} else {
				storage.removeItem("items");
			}
		},
		addItem: function (item) {
			// Set index on item.
			item.id = (this.items.length + 1);

			// Add item to list (data).
			this.items.push(item);

			// Save data.
			this.saveItems();
		},
		removeItem: function (id) {
			// Remove item from list (data).
			for (var i = 0, l = this.items.length, item; i < l; ++i) {
				if (id == this.items[i].id) {
					this.items.splice(i, 1);
					break;
				}
			}

			// Save data.
			this.saveItems();
		}
	};

	// Form module.
	var form = {
		init: function () {
			// Get form elements.
			this.el = $get("form");
			this.dateInput = $get("input[type=date]", this.el);
			this.textInputs = $getAll("input[type=text]", this.el);

			// Set initial value for date input.
			this.setDate();

			// Handle date input change events.
			$on(this.dateInput, "change", function (event, target) {
				// Reset date when cleared.
				if (!target.value.length) {
					form.setDate();
				}

				// Get current date.
				var date = model.getDate();

				// Update date value.
				model.setDate(target.value);

				// Update list if date changed.
				if (date != model.getDate()) {
					list.renderList();
				}
			});

			// Handle text input focus events.
			$on(this.el, "focusin", "input[type=text]", function (event, target) {
				// Clear text selection.
				setTimeout(function () {
					target.selectionStart = target.selectionEnd;
				}, 0);
			});

			// Handle text input blur events.
			$on(this.el, "focusout", "input[type=text]", function (event, target) {
				// Close autocomplete.
				autocomplete.close();
			});

			// Ignore enter key in keydown events.
			$on(this.el, "keydown", function (event) {
				if (keyCodes.ENTER == event.keyCode) {
					event.preventDefault();
				}
			});

			// Ignore enter key in keypress events.
			$on(this.el, "keypress", function (event) {
				if (keyCodes.ENTER == event.keyCode) {
					event.preventDefault();
				}
			});

			// Handle text input keyup events.
			$on(this.el, "keyup", "input[type=text]", function (event, target) {
				var value;

				// Special case for time.
				if ("time" == target.name) {
					if (keyCodes.UP == event.keyCode) {
						// Increment value by 0.5.
						value = parseFloat(target.value);
						target.value = (value ? (value + 0.5) : 0.5);
					} else if (keyCodes.DOWN == event.keyCode) {
						// Decrement value by 0.5.
						value = parseFloat(target.value);
						target.value = (value ? Math.max((value - 0.5), 0.0) : 0.0);
					} else if (keyCodes.ENTER == event.keyCode) {
						// Submit form.
						form.submit();
					}
				// Other text inputs.
				} else if (keyCodes.UP == event.keyCode) {
					// Select previous item in autocomplete.
					autocomplete.previous();
				} else if (keyCodes.DOWN == event.keyCode) {
					// Select next item in autocomplete.
					autocomplete.next();
				} else if (keyCodes.ENTER == event.keyCode) {
					// If autocomplete is closed.
					if (!autocomplete.isOpen()) {
						// Submit form.
						form.submit();

						// Stop here.
						event.preventDefault();
						return;
					}

					// Get value of active item in autocomplete.
					value = autocomplete.getValue();

					// If non-empty value.
					if (value && value.length) {
						// Set input value.
						target.value = value;

						// Close autocomplete.
						autocomplete.close();

						// Stop here.
						event.preventDefault();
					}
				} else if ((keyCodes.TAB != event.keyCode) &&
					(keyCodes.SHIFT != event.keyCode)) {
					// Open autocomplete.
					autocomplete.open(target);
				}
			});

			// Handle button keyup events.
			$on(this.el, "keyup", "button", function (event, target) {
				if ((keyCodes.ENTER == event.keyCode) ||
					(keyCodes.SPACE == event.keyCode)) {
					if ("reset-form" == target.className) {
						// Reset form.
						form.reset(true);
					} else {
						// Submit form.
						form.submit();
					}

					// Stop here.
					event.preventDefault();
				}
			});

			// Handle button click events.
			$on(this.el, "click", "button", function (event, target) {
				if ("reset-form" == target.className) {
					// Reset form.
					form.reset(true);
				} else {
					// Submit form.
					form.submit();
				}

				// Stop here.
				event.preventDefault();
			});

			// Focus on first text input.
			this.focus();
		},
		setDate: function () {
			// Get date from model and set date input value.
			this.dateInput.value = model.getDate();
		},
		focus: function () {
			// Focus on first text input (with error, if any).
			($get("label.error input", this.el) ||
				this.textInputs[0]).focus();
		},
		clearErrors: function () {
			// Loop over text inputs and remove errors.
			$forEach(this.textInputs, function () {
				form.removeError(this);
			});
		},
		reset: function (resetDate) {
			// Clear previous errors.
			this.clearErrors();

			// Get date.
			var date = this.dateInput.value;

			// Reset form.
			this.el.reset();

			// Reset date.
			if (resetDate) {
				this.setDate();
			} else {
				this.dateInput.value = date;
			}

			// Focus on first text input.
			this.focus();
		},
		serialize: function () {
			// Start building item.
			var item = {};

			// Add date.
			item[this.dateInput.name] = this.dateInput.value;

			// Add other fields.
			$forEach(this.textInputs, function () {
				item[this.name] = this.value;
			});

			// Return result.
			return item;
		},
		addError: function (input) {
			// Add error class to input.
			input.parentNode.classList.add("error");
		},
		removeError: function (input) {
			// Remove error class from input.
			input.parentNode.classList.remove("error");
		},
		submit: function () {
			// Clear previous errors.
			this.clearErrors();

			// Validate text inputs.
			var valid = true;

			$forEach(this.textInputs, function () {
				if ("time" == this.name) {
					var value = parseFloat(this.value);
					if (!value || (value <= 0.0)) {
						form.addError(this);
						valid = false;
					}
				} else if (!this.value.length) {
					form.addError(this);
					valid = false;
				}
			});

			// If valid...
			if (valid) {
				// Add item to list.
				timeLoggr.addItem(this.serialize());

				// Reset form (text inputs only).
				this.reset(false);
			}

			// Focus on first text input.
			this.focus();
		}
	};

	// List module.
	var list = {
		init: function () {
			// Get list element.
			this.el = $get("#list");

			// Get "empty" item.
			this.emptyItem = $get("li.no-items", this.el);

			// Render list items.
			this.renderList();

			// Handle remove button click events.
			$on(this.el, "click", ".remove-item", function (event, target) {
				// Remove item from list.
				timeLoggr.removeItem(target.parentNode);
			});
		},
		renderItem: function (item) {
			// Render contents of each item.
			var result = '<span class="time">';
			result += item.time;
			result += 'h</span>';
			result += '<span class="detail">';
			result += '<span class="customer">';
			result += item.customer;
			result += '</span>';
			result += ' / ';
			result += '<span class="project">';
			result += item.project;
			result += '</span>';
			result += '<small>';
			result += item.description;
			result += '</small>';
			result += '</span>';
			result += '<button class="remove-item">×</button>';
			return result;
		},
		renderList: function () {
			// Get current date.
			var date = model.getDate();

			// Build list markup.
			var lis = "";

			// Add list items having given date.
			if (model.items && model.items.length) {
				model.items.forEach(function (item) {
					if (date == item.date) {
						lis += '<li data-id="';
						lis += item.id;
						lis += '">';
						lis += list.renderItem(item);
						lis += '</li>';
					}
				});
			}

			// Non-empty list. Update it.
			if (lis.length) {
				this.el.innerHTML = lis;
			// Empty list. Add "empty" item if missing.
			} else if (!this.el.childNodes.length) {
				this.el.appendChild(this.emptyItem);
			}
		},
		addItem: function (item) {
			// Create single list item.
			var li = doc.createElement("li");

			// Set data-id on list item.
			li.setAttribute("data-id", item.id);

			// Render markup and set as item content.
			li.innerHTML = this.renderItem(item);

			// Remove "empty" item if present.
			if ($get("li.no-items", this.el)) {
				this.el.removeChild(this.emptyItem);
			}

			// Add item to list.
			this.el.appendChild(li);
		},
		removeItem: function (li) {
			// Remove item from list.
			this.el.removeChild(li);

			// If empty, add "empty" item.
			if (!this.el.childNodes.length) {
				this.el.appendChild(this.emptyItem);
			}
		}
	};

	// Autocomplete module.
	var autocomplete = {
		init: function () {
			// Get autocomplete element.
			this.el = $get("#autocomplete");
		},
		open: function (input) {
			// Set active input.
			this.input = input;

			// Find unique values of fields named like given input name.
			var matches = (input.value.length ? this.findMatches(
							model.items, input.name, input.value) :
							false);

			// Don't show autocomplete if no matches found.
			if (!matches || !matches.length) {
				this.close();
				return;
			}

			// Construct list.
			var items = "";

			matches.forEach(function (match, index) {
				if (!index) {
					items += '<li class="active">';
				} else {
					items += '<li>';
				}
				items += match;
				items += '</li>';
			});

			// Add items to element.
			this.el.innerHTML = items;

			// Position and show it.
			this.el.style.top = ($offsetTop(input) + "px");
			this.el.style.display = "block";
		},
		close: function () {
			// Unset active input.
			this.input = void 0;

			// Remove all items.
			this.el.innerHTML = "";

			// Hide it.
			this.el.style.display = "none";
		},
		isOpen: function () {
			return (this.input ? true : false);
		},
		getActiveItem: function () {
			return $get("li.active", this.el);
		},
		getValue: function () {
			var activeItem = this.getActiveItem();
			return (activeItem ? activeItem.textContent : void 0);
		},
		previous: function () {
			// Get active item and its previous sibling. Wrap as needed.
			var activeItem = this.getActiveItem(),
				previousItem = ((activeItem && activeItem.previousSibling) ?
								activeItem.previousSibling : this.el.lastChild);

			// Remove active class from active item.
			if (activeItem) {
				activeItem.classList.remove("active");
			}

			// Add active class to previous item.
			if (previousItem) {
				previousItem.classList.add("active");
			}
		},
		next: function () {
			// Get active item and its next sibling. Wrap as needed.
			var activeItem = this.getActiveItem(),
				nextItem = ((activeItem && activeItem.nextSibling) ?
							activeItem.nextSibling : this.el.firstChild);

			// Remove active class from active item.
			if (activeItem) {
				activeItem.classList.remove("active");
			}

			// Add active class to next item.
			if (nextItem) {
				nextItem.classList.add("active");
			}
		},
		findMatches: function (data, key, value) {
			// Temporarily store matches in object.
			var matches = {};

			// We want to match case-insensitively.
			value = value.toLowerCase();

			// Loop over data.
			data.forEach(function (datum) {
				// If value found in datum.
				if (datum[key].toLowerCase().indexOf(value) > -1) {
					// Add key to object.
					matches[datum[key]] = true;
				}
			});

			// Return sorted object keys as matches.
			return Object.keys(matches).sort();
		},
	};

	// Application module.
	var timeLoggr = {
		init: function () {
			// Initialize data model.
			model.init();

			// Initialize other modules.
			form.init();
			list.init();
			autocomplete.init();
		},
		addItem: function (item) {
			// Add item to model (data).
			model.addItem(item);

			// Add item to list (element).
			list.addItem(item);
		},
		removeItem: function (li) {
			// Remove item from model (data).
			model.removeItem(li.getAttribute("data-id"));

			// Remove item from list (element).
			list.removeItem(li);

			// Focus on first text input.
			form.focus();
		}
	};

	// Initialize application module when DOM is ready.
	$on(doc, "DOMContentLoaded", function () {
		timeLoggr.init();
	});
}(document, localStorage));