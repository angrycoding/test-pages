const REGEXP_ESCAPE = /([.?*+^$[\]\\(){}|-])/g;


type TokenID = string;

export interface Token {
	type: TokenID | TokenID[];
	pos: number;
	value?: string;
}

const escapeExpression = (expression: any) => {
	return '(' + (
		expression instanceof RegExp ?
		expression.toString().split('/').slice(1, -1).join('/') :
		String(expression).replace(REGEXP_ESCAPE, '\\$1')
	) + ')';
};

const compareToken = (token: Token, selector: TokenID | TokenID[]): boolean => {
	let c, fragment, type = token.type;
	if (!(selector instanceof Array)) selector = [selector];
	selector = selector.map(cleanupTokenId);
	for (c = 0; c < selector.length; c++) {
		fragment = selector[c];
		if (type instanceof Array ? type.indexOf(fragment) !== -1 : fragment === type) return true;
	}
	return false;
}

const cleanupTokenId = (tokenId: TokenID) => {
	if (typeof tokenId === 'string') {
		tokenId = tokenId.trim().toLowerCase();
	}
	return tokenId;
}


class Tokenizer {

	static EOF = '$eof';
	static ERROR = '$error';

	private buffer: [Token, ...Token[]] = [{ type: Tokenizer.EOF, pos: 0 }];
	private tokenIds: TokenID[] = [];
	private inputLen: number = 0;
	private inputStr: string = '';
	private regexp: RegExp = new RegExp('');
	private ignoredTokens: null | TokenID[] = null;

	constructor(...args: any[]) {
		const exprs = [], tokenIds = this.tokenIds = [];
		for (let c = 0; c < args.length; c += 2) {
			// @ts-ignore
			tokenIds.push(cleanupTokenId(args[c]));
			exprs.push(escapeExpression(args[c + 1]));
		}
		this.regexp = new RegExp(exprs.join('|'), 'g');
	}


	private isIgnored(token: Token): boolean {
		const ignoredTokens = this.ignoredTokens;
		if (!ignoredTokens) return false;
		return compareToken(token, ignoredTokens);
	}

	private readTokenToBuffer() {

		let matchObj, matchStr,
			buffer = this.buffer,
			regexp = this.regexp,
			startPos = regexp.lastIndex,
			checkIndex = this.inputLen;
	
		if (startPos >= checkIndex) {
			// return Tokenizer.EOF if we reached end of file
			buffer.push({type: Tokenizer.EOF, pos: checkIndex});
		}
	
		else if (matchObj = regexp.exec(matchStr = this.inputStr)) {
	
			// check if we have Tokenizer.ERROR token
			if (startPos < (checkIndex = matchObj.index)) {
				buffer.push({
					type: Tokenizer.ERROR,
					pos: startPos,
					value: matchStr.slice(startPos, checkIndex)
				});
			}
	
			while (matchObj.pop() === undefined);
	
			buffer.push({
				type: this.tokenIds[matchObj.length - 1],
				pos: checkIndex,
				value: matchObj[0]
			});
	
		}
	
		// return Tokenizer.ERROR token in case if we couldn't match anything
		else {
			regexp.lastIndex = checkIndex;
			buffer.push({
				type: Tokenizer.ERROR,
				pos: startPos,
				value: matchStr.slice(startPos)
			});
		}
	}

	private getTokenFromBuffer(offset: number): Token {
		let buffer = this.buffer, toRead = offset - buffer.length + 1;
		while (toRead-- > 0) this.readTokenToBuffer();
		return buffer[offset];
	}

	private getAnyToken(consume: boolean): Token {
		var token, offset = 0, buffer = this.buffer;
		if (consume) while (token = this.getTokenFromBuffer(0), buffer.shift(), this.isIgnored(token));
		else while (token = this.getTokenFromBuffer(offset++), this.isIgnored(token));
		return token;
	}

	private getSpecificToken(selector: TokenID[], consume: boolean): any {

		var token, length = selector.length,
			index = 0, offset = 0;
	
		var x = [];
	
		for (;;) if (compareToken(
			token = this.getTokenFromBuffer(offset++),
			selector[index]
		)) {
			x.push(token);
			if (++index >= length) break;
		}
	
		else if (!this.isIgnored(token)) return;
	
		if (!consume) return true;
	
		var buffer = this.buffer;
		while (offset--) buffer.shift();
	
		return (x.length === 1 ? x[0] : x);
	}

	init(inputStr: string, ...ignoredTokens: TokenID[]) {
		this.regexp.lastIndex = 0;
		this.buffer.splice(0, Infinity);
		this.inputStr = inputStr;
		this.inputLen = inputStr.length;
		ignoredTokens = ignoredTokens.map(cleanupTokenId);
		ignoredTokens = ignoredTokens.filter(token => this.tokenIds.includes(token));
		ignoredTokens.sort();
		this.ignoredTokens = (ignoredTokens.length ? ignoredTokens : null);
	}

	setIgnored(...newIgnoredTokens: TokenID[]): Tokenizer {
		let ignoreTokens: TokenID[] | null = newIgnoredTokens.map(cleanupTokenId);
		ignoreTokens = ignoreTokens.filter(token => this.tokenIds.includes(token));
		ignoreTokens.sort();
		if (!ignoreTokens.length) ignoreTokens = null;
		if (JSON.stringify(ignoreTokens) === JSON.stringify(this.ignoredTokens)) return this;
		const instance = Object.create(this);
		instance.ignoredTokens = ignoreTokens;
		return instance;
	}

	next(...args: TokenID[]) {
		return (
			args.length ?
			this.getSpecificToken(args, true) :
			this.getAnyToken(true)
		);
	}

	test(...args: TokenID[]) {
		return (
			args.length ?
			this.getSpecificToken(args, false) :
			this.getAnyToken(false)
		);
	}

}


export default Tokenizer;