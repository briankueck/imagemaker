// Simply suppresses Iron Router's on-screen message, about not having a home route.
Router.route('/', () => {}, {where: 'client'});