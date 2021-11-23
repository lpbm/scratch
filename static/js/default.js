const warning = 'Since there is no content, this page will be deleted once you close the tab or browser window.';
$(document).ready( function() {
	const uri = $(location).attr('href');

	let editable = $("body > section:first-child");
	editable.unlocked = function() {
		return editable.prop('contentEditable') == "true"
	};
	editable.lock = function () {
		editable.attr("contentEditable", false);
	};
	editable.unlock = function () {
		editable.attr("contentEditable", true);
	};
	editable.emptyContent = function () {
		const that = $(this);
		if (editable.unlocked()) {
			let lastModified = that.data('modified');

			if (typeof (lastModified) == 'undefined') {
				lastModified = that.attr('data-modified');
			}
			const d = new Date(lastModified);
			if (d.toString() == 'Invalid Date') {
				previousContent = ' ';
				that.html(previousContent);
			}
		}
	};

	const lock = $('<svg aria-hidden="true" class="icon"><use xlink:href="/icons.svg#icon-lock"><title>Locked</title></use></svg>')
	const unlock = $('<svg aria-hidden="true" class="icon"><use xlink:href="/icons.svg#icon-unlock"><title>Unlocked</title></use></svg>')

	const a = $('<a/>').addClass('hidden');
	a.click (function (e) {
		const message = 'Please enter the secret key for this page.';
		authToken = prompt (message, '');
		if (authToken != null) {
			let icon = a.find("svg");
			let isLocked = icon.find("title").text() == "Locked";
			console.debug("is Locked: %s %s", icon.find("title").text(), isLocked);
			if (isLocked) {
				console.debug("checking auth token: %s", authToken);
				checkForSecrets();
			} else {
				console.debug("saving auth token: %s", authToken);
				saveKey();
			}
		}
	});

	const feedBack = $("<nav/>").addClass('feedback').append(a);
	feedBack.mouseenter(function(e) {
		a.fadeIn(1200, () => { a.addClass("hidden"); });
	}).mouseleave(function (e) {
		a.fadeOut(1200, () => { a.removeClass("hidden"); });
	}).click(function (e) {
		if (a.css('opacity') == 0 || a.css('display') == 'none') {
			a.fadeIn(1200).fadeOut(1200);
		}
	});
	$("body").prepend(feedBack);

	editable.unlock();

	const titleText = editable.attr('title');

	let waitTime = 3000; // milliseconds
	let start = new Date(); // start of the save request
	let finish = new Date(); // finish of the save request
	let authToken = null;
	let previousContent = editable.html();
	let bStillSaving = false;
	let selection = null;


	function removeOnClose(e) {
		let request = $.ajax({
			url: uri,
			type: 'delete',
			beforeSend: setAuthorizationToken,
		});
		request.always((jqXHR, status) => {
			console.debug("deleted %s: %s", uri, status)
		});
		return warning;
	}

	editable.keyup (function(e) {
		if (
			editable.prop("contentEditable") == "true" &&
			editable.text().trim().length == 0 &&
			editable.children("img").length == 0
		) {
			editable.prop('title', warning);
			// bind delete on window close if there's no content
			console.debug("preparing to delete %s", uri)
			window.addEventListener ('beforeunload', removeOnClose);
		} else {
			editable.prop ('title', titleText);
			// remove the delete action if the user wrote something
			window.removeEventListener('beforeunload', removeOnClose);
		}
	}).bind('click', function(e) {
		editable.emptyContent();
		selection = window.getSelection();
	}).bind('dragover', function(e) {
		editable.emptyContent();
		selection = window.getSelection();
		e.preventDefault();
		e.stopPropagation();
	}).bind('drop', function (e) {
		selection = window.getSelection();//.getRangeAt(0);
		editable.emptyContent();
		handleFileSelect(e);
	});

	// adding click events to make links to work in edit mode
	editable.find('a').mousedown(function(e) {
		const la = $(e.target);
		if (la.is('a') && editable.unlocked()) {
			e.preventDefault();
			e.stopPropagation();
			switch (e.detail) {
			case 1:
				location.href = la.attr('href');
				break;
			case 2:
				window.open(la.attr('href'));
			}
		}
	});

	checkForSecrets();

	setInterval(() => { save(); }, waitTime);

	function setAuthorizationToken(xhr) {
		if (authToken != null) {
			xhr.setRequestHeader("Authorization", authToken);
		}
	};

	function checkForSecrets() {
		console.debug("check secrets: %s", authToken)
		let request = $.ajax({
			url: uri,
			type: 'head',
			beforeSend: setAuthorizationToken,
		});
		request.done(() => {
			a.empty();
			a.append(unlock);
			editable.attr("contentEditable", true);
			console.debug("unlocked");
		});
		request.fail((xhr) => {
			if (xhr.status == 401) {
				a.empty();
				a.append(lock);
				editable.attr("contentEditable", false);
				console.debug("locked");
			}
		});
	};

	function unsavedChanges (text) {
		return text != previousContent;
	};

	function resetTimer (xhr, status) {
		bStillSaving = false;
		finish = new Date();
		const lastRun = finish.getTime() - start.getTime();
		let multiplier = 2;
		if (lastRun > 5000) {
			multiplier = 0.1;
		} else if (lastRun > 1000) {
			multiplier = 1;
		} else if (lastRun < 400) {
			multiplier = 10;
		} else if (lastRun < 100) {
			multiplier = 20;
		}
		waitTime = lastRun * multiplier;
	};

	function saveKey () {
		let request = $.ajax({
			url: uri,
			type: 'patch',
			beforeSend: function (xhr) {
				bStillSaving = true;
				setAuthorizationToken(xhr);
			},
		});

		request.done(() => {
			console.debug(request);
		});
		request.fail((xhr) => {
			console.error("failed to update key:", xhr);
		});
		request.always(resetTimer);
	};

	function save () {
		console.debug ("next check: in %dms", waitTime);
		console.debug ("still saving: %s", (bStillSaving ? 'yes' : 'no'));
		if (bStillSaving) {
			return;
		}
		console.debug ("is editable: %s", editable.unlocked());
		if (!editable.unlocked()) {
			return;
		}
		const changes = unsavedChanges (editable.html());
		console.debug ("changes: %s", changes);
		if (!changes) {
			return;
		}
		const now = new Date();
		const overTheWaitTime = ((now.getTime() - finish.getTime()) > waitTime);
		console.debug ("over the wait time: %s", overTheWaitTime);
		if (!overTheWaitTime) {
			return;
		}
		const modifiedLast = new Date(editable.data("modified"));
		console.debug ("last modified: %sms ago", (now.getTime() - modifiedLast));
		console.debug ("last save: %dms ago", (now.getTime() - finish.getTime()));

		editable.fresheditor('save', function (id, content) {
			const postData = {'content': content};
			let request = $.ajax({
				url: uri,
				type: 'post',
				data: postData,
				beforeSend: function (xhr) {
					start = new Date();
					bStillSaving = true;
					previousContent = content;
					setAuthorizationToken(xhr);
				},
			});

			request.done(() => {
				console.debug(request);
				if (request.status == 200) {
					editable.data('modified', now.valueOf());
				}
			});
			request.fail((xhr) => {
				console.error("failed to update: %d", xhr.status, xhr);
			});
			request.always(resetTimer);
		});
	}

	/*
	function isSaveKey (e) {
		//var moveKeys	= [33,34,35, 36, 37,38,39,40]; // pg-down, pg-up, end, home, left, up, right, down
		const singleKeys	= [8,9,13,32,46,190]; // bksp, cr, space, tab, del, "." ,
		const ctrlKeys	= [27, 83, 90]; // ctrl-v, ctrl-s, ctrl-z
		const shiftKeys	= [16]; // shift-insert

		if (e.ctrlKey && ctrlKeys.indexOf (e.keyCode) != -1) {
			return true
		}

		if (e.shiftKey && shiftKeys.indexOf (e.keyCode) != -1) {
			return true;
		}

		if (singleKeys.indexOf (e.keyCode) != -1) {
			return true;
		}
		return false;
	}

	function handleDragOver(e) {
		e.stopPropagation();
		e.preventDefault();
		const evt = e.originalEvent;
		evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
	};

	function handleFileSelect(e) {
		e.stopPropagation();
		e.preventDefault();

		const evt = e.originalEvent;
		const files = evt.dataTransfer.files; // FileList object

		if (files.length != 0) {
			for (let i = 0, f; f = files[i]; i++) {
				if (!f.type.match('image.*')) {
					continue;
				}
				const reader = new FileReader();
				reader.onload = (function (theFile) {
					return function(e) {
						//const img = $('<img src="' + e.target.result + '" data-name="'+theFile.name+'"/>');
						const img = document.createElement ("img");
						img.src = e.target.result;
						img.title = theFile.name;
						img.dataSize= theFile.size;
						img.dataName=theFile.name;

						if (selection.rangeCount > 0 && selection.getRangeAt(0).startContainer != $('body').get(0)) {
							const range = selection.getRangeAt(0);
							const fragment = document.createDocumentFragment();
							fragment.appendChild (img);

							range.deleteContents();
							range.insertNode(fragment);
						} else {
							const elem = $(evt.target);
							elem.append (img);
						}
						save();
					};
				})(f);

				reader.readAsDataURL (f);
			}
		}
	};

	function pad(n) {return n<10 ? '0'+n : n}
	*/
});
