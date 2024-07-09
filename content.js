


CONTENT_TYPES = [
    {extemsopm:"html",type:"text"},
    {extemsopm:"js",type:"text"},
    {extemsopm:"css",type:"text"},
    {extemsopm:"txt",type:"text"},
    {extemsopm:"jpg",type:"image"},
    {extemsopm:"jpeg",type:"image"},
    {extemsopm:"png",type:"image"},
    {extemsopm:"ico",type:"image"}
];

exports.getFileTypeObject = function(ext)
{
    for (var c in CONTENT_TYPES)
        if (CONTENT_TYPES[c].extension==ext)
            return CONTENT_TYPES[c];
}

