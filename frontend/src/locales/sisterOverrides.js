/**
 * Native overrides for languages without a full dictionary yet.
 * These languages fall back to a closely-related sister language via
 * FALLBACK_CHAINS (Assamese→Bengali, Sindhi→Urdu, Bodo→Hindi, etc.), so the
 * interface is never a mix of English and the selected language. Only the
 * strings that identify the language itself are overridden here; every other
 * key resolves from the sister language's complete dictionary.
 */
export const sisterOverrides = {
  as: { languageChanged: 'ভাষা অসমীয়ালৈ সলনি কৰা হৈছে' },                       // Assamese
  ks: { languageChanged: 'زبان کٲشُر منز بدلیو' },                              // Kashmiri
  kok: { languageChanged: 'भास कोंकणींत बदलली' },                               // Konkani
  mai: { languageChanged: 'भाषा मैथिली मे बदलल गेल' },                          // Maithili
  brx: { languageChanged: 'रायखोम बड़ोआव बांसिन गोनां' },                        // Bodo
  doi: { languageChanged: 'भाशा डोगरी च बदली गई' },                             // Dogri
  sd: { languageChanged: 'ٻولي سنڌي ۾ مٽايو ويو' },                             // Sindhi
  mni: { languageChanged: 'ꯂꯣꯟ ꯃꯩꯇꯩꯂꯣꯟꯗ ꯀꯨꯏꯅꯥꯌ' },                                // Manipuri (Meitei Mayek)
  ne: { languageChanged: 'भाषा नेपालीमा परिवर्तन गरियो' },                       // Nepali
  sa: { languageChanged: 'भाषा संस्कृतम् परिवर्तिता' },                          // Sanskrit
  sat: { languageChanged: 'ᱯᱟᱹᱨᱥᱤ ᱥᱟᱱᱛᱟᱲᱤ ᱨᱮ ᱵᱚᱫᱚᱞ ᱮᱱᱟ' },                      // Santali
};
