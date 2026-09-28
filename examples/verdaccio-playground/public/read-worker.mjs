import * as XLSX from '/vendor/xlsx.mjs';
import * as codepage from '/vendor/cpexcel.full.mjs';
XLSX.set_cptable(codepage);
self.onmessage = ({ data }) => {
    try {
        if (data.kind === 'cfb')
            self.postMessage({ container: XLSX.CFB.read(new Uint8Array(data.bytes), { type: 'array' }) });
        else
            self.postMessage({ workbook: XLSX.read(data.bytes, { ...data.options, type: 'array' }) });
    }
    catch (error) {
        self.postMessage({ error: error.message });
    }
};
