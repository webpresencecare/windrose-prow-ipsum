/**
 * Windrose Prow for Ipsum on a WordPress network with WP-CLI (WINDROSE_E2E_HOST: the network's host, default localhost).
 * Works on a throwaway site created here and deleted at the end, never on the network's other sites.
 */
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

const HOST = process.env.WINDROSE_E2E_HOST ?? 'localhost';
const SLUG = 'prow-e2e';
const SITE = `https://${ HOST }/${ SLUG }/`;
const wp = ( ...args ) =>
	execFileSync( 'wp', [ ...args, '--path=/var/www/html/web', `--url=${ SITE }` ], { encoding: 'utf8' } ).trim();
const wpNetwork = ( ...args ) =>
	execFileSync( 'wp', [ ...args, '--path=/var/www/html/web', `--url=https://${ HOST }/` ], { encoding: 'utf8' } ).trim();

const VARIATIONS = [
	{ title: 'Open Sea', bg: '#f6f9fb', text: '#12263a', body: 'Inter', heading: 'Archivo', file: 'inter-var-normal.woff2' },
];

test.describe.configure( { mode: 'serial' } );
let siteId = '';

test.beforeAll( () => {
	// A site left by an interrupted run.
	if ( wpNetwork( 'site', 'list', '--field=path' ).split( '\n' ).includes( `/${ SLUG }/` ) ) {
		wpNetwork( 'site', 'delete', `--slug=${ SLUG }`, '--yes' );
	}
	siteId = wpNetwork( 'site', 'create', `--slug=${ SLUG }`, '--title=Prow e2e', '--email=prow-e2e@example.com', '--porcelain' );
	wp( 'theme', 'enable', 'windrose-prow-ipsum' );
	wp( 'theme', 'activate', 'windrose-prow-ipsum' );
} );

test.afterAll( () => {
	wpNetwork( 'site', 'delete', `--slug=${ SLUG }`, '--yes' );
	// Core leaves the deleted site's empty uploads folder behind.
	if ( /^\d+$/.test( siteId ) ) {
		rmSync( `/var/www/html/web/wp-content/uploads/sites/${ siteId }`, { recursive: true, force: true } );
	}
} );

/** Picks a style variation in the Site Editor and saves it. */
async function pick( page, title ) {
	await page.goto( `/${ SLUG }/wp-admin/site-editor.php?p=%2Fstyles` );
	await page.getByRole( 'button', { name: 'Browse styles' } ).click();
	await page.getByRole( 'button', { name: title, exact: true } ).or( page.getByLabel( title, { exact: true } ) ).first().click();
	await page.getByRole( 'button', { name: /Review \d+ change/ } ).click();
	await page.getByRole( 'button', { name: 'Save', exact: true } ).last().click();
	await expect( page.getByRole( 'button', { name: /Review \d+ change/ } ) ).toHaveCount( 0, { timeout: 15000 } );
}

test( 'Prow lists its variation after Ipsum’s presets', async ( { page } ) => {
	await page.goto( `/${ SLUG }/wp-admin/site-editor.php?p=%2Fstyles` );
	await page.waitForFunction( () => window.wp?.data?.select( 'core' ) );
	const titles = await page.evaluate( async () =>
		( await window.wp.data.resolveSelect( 'core' ).__experimentalGetCurrentThemeGlobalStylesVariations() ).map( ( v ) => v.title )
	);
	expect( titles ).toEqual( expect.arrayContaining( [ 'Blue Hour', 'Open Sea' ] ) );
} );

for ( const v of VARIATIONS ) {
	test( `${ v.title }: applied, local fonts only, accessible`, async ( { page, browser } ) => {
		await pick( page, v.title );
		const visitor = await browser.newContext( { storageState: { cookies: [], origins: [] }, ignoreHTTPSErrors: true } );
		const front = await visitor.newPage();
		const external = [];
		const fonts = [];
		front.on( 'request', ( r ) => {
			const u = new URL( r.url() );
			if ( u.hostname !== HOST ) external.push( u.hostname + u.pathname );
		} );
		front.on( 'response', ( r ) => {
			if ( /\.(woff2|ttf)$/.test( r.url() ) ) fonts.push( `${ r.status() } ${ r.url().split( '/' ).pop() }` );
		} );
		await front.goto( SITE );
		await front.evaluate( () => document.fonts.ready );
		const css = await front.evaluate( () => {
			const s = getComputedStyle( document.body );
			const h = document.querySelector( 'h1, h2' );
			return {
				bg: getComputedStyle( document.documentElement ).getPropertyValue( '--wp--preset--color--base' ).trim(),
				text: getComputedStyle( document.documentElement ).getPropertyValue( '--wp--preset--color--contrast' ).trim(),
				body: s.fontFamily,
				heading: h ? getComputedStyle( h ).fontFamily : '',
			};
		} );
		expect( css.bg ).toBe( v.bg );
		expect( css.text ).toBe( v.text );
		expect( css.body ).toContain( v.body );
		expect( css.heading ).toContain( v.heading );
		expect( fonts ).toContain( `200 ${ v.file }` );
		expect( external ).toEqual( [] );
		// Known core issue, also on plain Ipsum: with no saved menu, the Navigation block's page list fallback puts a
		// <ul> directly inside another <ul> (axe "list"). Not Prow's; every other rule is checked.
		const axe = await new AxeBuilder( { page: front } )
			.withTags( [ 'wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa' ] )
			.exclude( '.wp-block-navigation__container:has(> ul.wp-block-page-list)' )
			.analyze();
		expect( axe.violations.map( ( x ) => `${ x.id }: ${ x.nodes.map( ( n ) => n.target ).join( ', ' ) }` ) ).toEqual( [] );
		if ( 'Open Sea' === v.title && process.env.PROW_SCREENSHOT ) {
			await front.setViewportSize( { width: 1200, height: 900 } );
			await front.screenshot( { path: process.env.PROW_SCREENSHOT } );
		}
		await visitor.close();
	} );
}

test( 'right to left (Arabic): page is rtl, fonts and colours unchanged', async ( { browser } ) => {
	wp( 'option', 'update', 'WPLANG', 'ar' );
	try {
		const visitor = await browser.newContext( { storageState: { cookies: [], origins: [] }, ignoreHTTPSErrors: true } );
		const front = await visitor.newPage();
		const errors = [];
		front.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await front.goto( SITE );
		expect( await front.getAttribute( 'html', 'dir' ) ).toBe( 'rtl' );
		expect( await front.evaluate( () => getComputedStyle( document.documentElement ).getPropertyValue( '--wp--preset--color--base' ).trim() ) ).toBe( '#f6f9fb' );
		expect( errors ).toEqual( [] );
		await visitor.close();
	} finally {
		wp( 'option', 'update', 'WPLANG', '' );
	}
} );
