import React from 'react';
import Tokenizer, { Token } from './utils/Tokenizer';


const tokenizer = new Tokenizer(
	'FLOAT', /(?:[0-9]*\.)?[0-9]+[eE][+-]?[0-9]+/,
	'FLOAT', /[0-9]*\.[0-9]+/,
	'INT', /[0-9]+/,
	'ID', /[_$a-zA-Z][_$a-zA-Z0-9]*/,
	'PLUS', '+',
	'MINUS', '-',
	'MUL', '*',
	'DIV', '/',
	'LPAREN', '(',
	'RPAREN', ')',
	'SPACES', /[\x0A\x0D\x09\x20]+/
);

interface Props {}

interface State {
	tokens: Token[];
}

export default class extends React.Component<Props, State> {

	constructor(props: Props) {
		super(props);
		this.state = {
			tokens: []
		}
	}



	setText = (text: string) => {
		tokenizer.init(text);
		const tokens = [];
		for (;;) {
			const token = tokenizer.next();
			tokens.push(token);
			if (token.type === Tokenizer.EOF) break;
		}
		this.setState({ tokens });
	}

	render() {
		const { tokens } = this.state;
		return <div>
			<textarea style={{width: '100%', height: 300}} onChange={e => this.setText(e.target.value)} />
			<div style={{padding: 10}}>
				
				{tokens.map((token, index) => (
					<div key={index} style={{border: '1px solid red', display: 'inline-block', marginRight: 10, marginBottom: 10, borderRadius: 4, padding: 8}}>
						{[token.type].flat().join(' | ')}
						{token.value && `(${JSON.stringify(token.value)})`}
					</div>
				))}

			</div>
		</div>
	}
}
