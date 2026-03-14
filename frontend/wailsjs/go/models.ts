export namespace main {
	
	export class TestResultEntry {
	    score: number;
	    date: string;
	
	    static createFrom(source: any = {}) {
	        return new TestResultEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.score = source["score"];
	        this.date = source["date"];
	    }
	}
	export class PageMeta {
	    hoverCounts: {[key: string]: number};
	    testResults: TestResultEntry[];
	
	    static createFrom(source: any = {}) {
	        return new PageMeta(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hoverCounts = source["hoverCounts"];
	        this.testResults = this.convertValues(source["testResults"], TestResultEntry);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class NavItem {
	    type: string;
	    id: string;
	    name: string;
	    children?: NavItem[];
	
	    static createFrom(source: any = {}) {
	        return new NavItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.id = source["id"];
	        this.name = source["name"];
	        this.children = this.convertValues(source["children"], NavItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AppData {
	    structure: NavItem[];
	    content: {[key: string]: string};
	    meta: {[key: string]: PageMeta};
	
	    static createFrom(source: any = {}) {
	        return new AppData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.structure = this.convertValues(source["structure"], NavItem);
	        this.content = source["content"];
	        this.meta = this.convertValues(source["meta"], PageMeta, true);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AppSettings {
	    newlinePlaceholder: string;
	    fontFamily: string;
	    fontSize: string;
	    fontFamilyHistory: string[];
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.newlinePlaceholder = source["newlinePlaceholder"];
	        this.fontFamily = source["fontFamily"];
	        this.fontSize = source["fontSize"];
	        this.fontFamilyHistory = source["fontFamilyHistory"];
	    }
	}
	
	

}

