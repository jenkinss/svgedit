(function () {
  'use strict';

  /* globals jQuery */
  /*
   * ext-arrows.js
   *
   * Licensed under the MIT License
   *
   * Copyright(c) 2010 Alexis Deveria
   *
   */

  svgEditor.addExtension('Arrows', function (S) {
    var svgCanvas = svgEditor.canvas;
    var $ = jQuery;
    // {svgcontent} = S,
    var addElem = S.addSvgElementFromJson,
        nonce = S.nonce,
        langList = {
      en: [{ id: 'arrow_none', textContent: 'No arrow' }],
      fr: [{ id: 'arrow_none', textContent: 'Sans flèche' }]
    },
        prefix = 'se_arrow_';


    var selElems = void 0,
        arrowprefix = void 0,
        randomizeIds = S.randomize_ids;

    function setArrowNonce(window, n) {
      randomizeIds = true;
      arrowprefix = prefix + n + '_';
      pathdata.fw.id = arrowprefix + 'fw';
      pathdata.bk.id = arrowprefix + 'bk';
    }

    function unsetArrowNonce(window) {
      randomizeIds = false;
      arrowprefix = prefix;
      pathdata.fw.id = arrowprefix + 'fw';
      pathdata.bk.id = arrowprefix + 'bk';
    }

    svgCanvas.bind('setnonce', setArrowNonce);
    svgCanvas.bind('unsetnonce', unsetArrowNonce);

    if (randomizeIds) {
      arrowprefix = prefix + nonce + '_';
    } else {
      arrowprefix = prefix;
    }

    var pathdata = {
      fw: { d: 'm0,0l10,5l-10,5l5,-5l-5,-5z', refx: 8, id: arrowprefix + 'fw' },
      bk: { d: 'm10,0l-10,5l10,5l-5,-5l5,-5z', refx: 2, id: arrowprefix + 'bk' }
    };

    function getLinked(elem, attr) {
      var str = elem.getAttribute(attr);
      if (!str) {
        return null;
      }
      var m = str.match(/\(#(.*)\)/);
      if (!m || m.length !== 2) {
        return null;
      }
      return S.getElem(m[1]);
    }

    function showPanel(on) {
      $('#arrow_panel').toggle(on);
      if (on) {
        var el = selElems[0];
        var end = el.getAttribute('marker-end');
        var start = el.getAttribute('marker-start');
        var mid = el.getAttribute('marker-mid');
        var val = void 0;
        if (end && start) {
          val = 'both';
        } else if (end) {
          val = 'end';
        } else if (start) {
          val = 'start';
        } else if (mid) {
          val = 'mid';
          if (mid.includes('bk')) {
            val = 'mid_bk';
          }
        }

        if (!start && !mid && !end) {
          val = 'none';
        }

        $('#arrow_list').val(val);
      }
    }

    function resetMarker() {
      var el = selElems[0];
      el.removeAttribute('marker-start');
      el.removeAttribute('marker-mid');
      el.removeAttribute('marker-end');
    }

    function addMarker(dir, type, id) {
      // TODO: Make marker (or use?) per arrow type, since refX can be different
      id = id || arrowprefix + dir;

      var data = pathdata[dir];

      if (type === 'mid') {
        data.refx = 5;
      }

      var marker = S.getElem(id);
      if (!marker) {
        marker = addElem({
          element: 'marker',
          attr: {
            viewBox: '0 0 10 10',
            id: id,
            refY: 5,
            markerUnits: 'strokeWidth',
            markerWidth: 5,
            markerHeight: 5,
            orient: 'auto',
            style: 'pointer-events:none' // Currently needed for Opera
          }
        });
        var arrow = addElem({
          element: 'path',
          attr: {
            d: data.d,
            fill: '#000000'
          }
        });
        marker.appendChild(arrow);
        S.findDefs().appendChild(marker);
      }

      marker.setAttribute('refX', data.refx);

      return marker;
    }

    function setArrow() {
      resetMarker();

      var type = this.value;
      if (type === 'none') {
        return;
      }

      // Set marker on element
      var dir = 'fw';
      if (type === 'mid_bk') {
        type = 'mid';
        dir = 'bk';
      } else if (type === 'both') {
        addMarker('bk', type);
        svgCanvas.changeSelectedAttribute('marker-start', 'url(#' + pathdata.bk.id + ')');
        type = 'end';
        dir = 'fw';
      } else if (type === 'start') {
        dir = 'bk';
      }

      addMarker(dir, type);
      svgCanvas.changeSelectedAttribute('marker-' + type, 'url(#' + pathdata[dir].id + ')');
      S.call('changed', selElems);
    }

    function colorChanged(elem) {
      var color = elem.getAttribute('stroke');
      var mtypes = ['start', 'mid', 'end'];
      var defs = S.findDefs();

      $.each(mtypes, function (i, type) {
        var marker = getLinked(elem, 'marker-' + type);
        if (!marker) {
          return;
        }

        var curColor = $(marker).children().attr('fill');
        var curD = $(marker).children().attr('d');
        if (curColor === color) {
          return;
        }

        var allMarkers = $(defs).find('marker');
        var newMarker = null;
        // Different color, check if already made
        allMarkers.each(function () {
          var attrs = $(this).children().attr(['fill', 'd']);
          if (attrs.fill === color && attrs.d === curD) {
            // Found another marker with this color and this path
            newMarker = this;
          }
        });

        if (!newMarker) {
          // Create a new marker with this color
          var lastId = marker.id;
          var dir = lastId.includes('_fw') ? 'fw' : 'bk';

          newMarker = addMarker(dir, type, arrowprefix + dir + allMarkers.length);

          $(newMarker).children().attr('fill', color);
        }

        $(elem).attr('marker-' + type, 'url(#' + newMarker.id + ')');

        // Check if last marker can be removed
        var remove = true;
        $(S.svgcontent).find('line, polyline, path, polygon').each(function () {
          var elem = this;
          $.each(mtypes, function (j, mtype) {
            if ($(elem).attr('marker-' + mtype) === 'url(#' + marker.id + ')') {
              remove = false;
              return remove;
            }
          });
          if (!remove) {
            return false;
          }
        });

        // Not found, so can safely remove
        if (remove) {
          $(marker).remove();
        }
      });
    }

    return {
      name: 'Arrows',
      context_tools: [{
        type: 'select',
        panel: 'arrow_panel',
        title: 'Select arrow type',
        id: 'arrow_list',
        options: {
          none: 'No arrow',
          end: '----&gt;',
          start: '&lt;----',
          both: '&lt;---&gt;',
          mid: '--&gt;--',
          mid_bk: '--&lt;--'
        },
        defval: 'none',
        events: {
          change: setArrow
        }
      }],
      callback: function callback() {
        $('#arrow_panel').hide();
        // Set ID so it can be translated in locale file
        $('#arrow_list option')[0].id = 'connector_no_arrow';
      },
      addLangData: function addLangData(lang) {
        return {
          data: langList[lang]
        };
      },
      selectedChanged: function selectedChanged(opts) {
        // Use this to update the current selected elements
        selElems = opts.elems;

        var markerElems = ['line', 'path', 'polyline', 'polygon'];
        var i = selElems.length;
        while (i--) {
          var elem = selElems[i];
          if (elem && markerElems.includes(elem.tagName)) {
            if (opts.selectedElement && !opts.multiselected) {
              showPanel(true);
            } else {
              showPanel(false);
            }
          } else {
            showPanel(false);
          }
        }
      },
      elementChanged: function elementChanged(opts) {
        var elem = opts.elems[0];
        if (elem && (elem.getAttribute('marker-start') || elem.getAttribute('marker-mid') || elem.getAttribute('marker-end'))) {
          // const start = elem.getAttribute('marker-start');
          // const mid = elem.getAttribute('marker-mid');
          // const end = elem.getAttribute('marker-end');
          // Has marker, so see if it should match color
          colorChanged(elem);
        }
      }
    };
  });

}());