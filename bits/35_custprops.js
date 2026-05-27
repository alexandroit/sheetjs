/* 15.2.12.2 Custom File Properties Part */
var custregex = /<[^<>]+>[^<]*/g;
function parse_cust_props(data/*:string*/, opts) {
	var p = safe_obj(), name = "";
	var m = data.match(custregex);
	if(m) for(var i = 0; i != m.length; ++i) {
		var x = m[i], y = parsexmltag(x);
		switch(strip_ns(y[0])) {
			case '<?xml': break;
			case '<Properties': break;
			case '<property': name = unescapexml(y.name); break;
			case '</property>': name = null; break;
			default: if (x.indexOf('<vt:') === 0 && name != null && !is_unsafe_key(name)) {
				var toks = x.split('>');
				var type = toks[0].slice(4), text = toks[1], val/*:any*/ = null, setval = true;
				/* 22.4.2.32 (CT_Variant). Omit the binary types from 22.4 (Variant Types) */
				switch(type) {
					case 'lpstr': case 'bstr': case 'lpwstr':
						val = unescapexml(text);
						break;
					case 'bool':
						val = parsexmlbool(text);
						break;
					case 'i1': case 'i2': case 'i4': case 'i8': case 'int': case 'uint':
						val = parseInt(text, 10);
						break;
					case 'r4': case 'r8': case 'decimal':
						val = parseFloat(text);
						break;
					case 'filetime': case 'date':
						val = parseDate(text);
						break;
					case 'cy': case 'error':
						val = unescapexml(text);
						break;
					default:
						setval = false;
						if(type.slice(-1) == '/') break;
						if(opts.WTF && typeof console !== 'undefined') console.warn('Unexpected', x, type, toks);
				}
				if(setval) safe_set_obj(p, name, val);
			} else if(x.slice(0,2) === "</") {/* empty */
			} else if(opts.WTF) throw new Error(x);
		}
	}
	return p;
}

function write_cust_props(cp/*::, opts*/)/*:string*/ {
	var o = [XML_HEADER, writextag('Properties', null, {
		'xmlns': XMLNS.CUST_PROPS,
		'xmlns:vt': XMLNS.vt
	})];
	if(!cp) return o.join("");
	var pid = 1;
	keys(cp).forEach(function custprop(k) {
		if(is_unsafe_key(k)) return;
		++pid;
		o[o.length] = (writextag('property', write_vt(cp[k], true), {
			'fmtid': '{D5CDD505-2E9C-101B-9397-08002B2CF9AE}',
			'pid': pid,
			'name': escapexml(k)
		}));
	});
	if(o.length>2){ o[o.length] = '</Properties>'; o[1]=o[1].replace("/>",">"); }
	return o.join("");
}
